const express = require("express");
const { requireAuth } = require("../middleware/auth");
const { prisma } = require("../lib/prisma");

const router = express.Router();

/**
 * GET /api/brand/campaigns/:id/smart-package?influencerId=USER_ID
 *
 * Returns:
 * - recommended listingId (package)
 * - top candidates with scores + reasons
 *
 * Uses only fields that are safe / likely present:
 * - Campaign.minBudget / maxBudget
 * - Listing.price, title, status (if exists)
 * - Order history for listing (orderType="campaign" or fallback)
 *
 * NOTE:
 * Your Order.sellerId is Seller.id
 * CampaignInfluencer.influencerId is User.id
 * Listing.sellerId is Seller.id
 */
router.get("/:id/smart-package", requireAuth, async (req, res) => {
  try {
    const brandId = req.user.id;
    const campaignId = String(req.params.id);
    const influencerId = String(req.query?.influencerId || "");

    if (!influencerId) {
      return res.status(400).json({ ok: false, error: "influencerId is required" });
    }

    // 1) Ensure campaign belongs to brand
    const campaign = await prisma.campaign.findFirst({
      where: { id: campaignId, brandId },
      select: {
        id: true,
        name: true,
        minBudget: true,
        maxBudget: true,
        budgetType: true,
        platform: true,
        objective: true,
      },
    });
    if (!campaign) return res.status(404).json({ ok: false, error: "Campaign not found" });

    // 2) Ensure influencer is part of campaign (invited/applied/etc.)
    const link = await prisma.campaignInfluencer.findUnique({
      where: { campaignId_influencerId: { campaignId, influencerId } },
      select: { id: true, status: true },
    });
    if (!link) {
      return res.status(404).json({ ok: false, error: "Creator is not part of this campaign" });
    }

    // 3) Find seller for this influencer user
    const seller = await prisma.seller.findFirst({
      where: { userId: influencerId },
      select: { id: true, userId: true },
    });
    if (!seller) {
      return res.status(404).json({ ok: false, error: "Seller profile not found for this creator" });
    }

    // 4) Fetch creator listings/packages (active first if status exists)
    // NOTE: If your Listing model doesn't have "status", Prisma will throw.
    // So we fetch minimally and do sorting in JS.
    const listings = await prisma.listing.findMany({
      where: { sellerId: seller.id },
      select: {
        id: true,
        title: true,
        price: true,
        // if your Listing has status, it will work; if not, remove the next line.
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    if (!listings.length) {
      return res.json({
        ok: true,
        recommended: null,
        alternatives: [],
        note: "Creator has no packages/listings yet. Ask creator to add packages to get smart suggestions.",
      });
    }

    // 5) Pull order history per listing (campaign orders preferred)
    // If your schema doesn't have orderType/campaignId yet, this will throw.
    // So we try campaign filtering first, fallback to all orders for those listings.
    const listingIds = listings.map((l) => l.id);

    let orders = [];
    try {
      orders = await prisma.order.findMany({
        where: {
          listingId: { in: listingIds },
          orderType: "campaign",
        },
        select: { id: true, listingId: true, status: true, totalPrice: true },
      });
    } catch {
      // fallback (older schema): use all orders for listingIds
      orders = await prisma.order.findMany({
        where: { listingId: { in: listingIds } },
        select: { id: true, listingId: true, status: true, totalPrice: true },
      });
    }

    const ordersByListing = new Map();
    for (const o of orders) {
      if (!ordersByListing.has(o.listingId)) ordersByListing.set(o.listingId, []);
      ordersByListing.get(o.listingId).push(o);
    }

    // 6) Scoring helpers
    const minB = campaign.minBudget == null ? null : Number(campaign.minBudget);
    const maxB = campaign.maxBudget == null ? null : Number(campaign.maxBudget);

    function clamp01(x) {
      return Math.max(0, Math.min(1, x));
    }

    function budgetFitScore(price) {
      // If no budget provided, neutral fit
      if (minB == null && maxB == null) return 0.6;

      const p = Number(price || 0);
      if (p <= 0) return 0;

      // within range => strong fit
      if ((minB == null || p >= minB) && (maxB == null || p <= maxB)) return 1;

      // outside range => decay based on distance
      let dist = 0;
      if (minB != null && p < minB) dist = (minB - p) / Math.max(1, minB);
      if (maxB != null && p > maxB) dist = (p - maxB) / Math.max(1, maxB);
      return clamp01(1 - dist); // can go to 0
    }

    function historicalScore(listingId) {
      const arr = ordersByListing.get(listingId) || [];
      const total = arr.length;
      if (!total) return { volume: 0, completion: 0 };

      const completed = arr.filter((x) => String(x.status || "").toLowerCase() === "completed").length;
      const completionRate = completed / total; // 0..1

      // volume normalized (10 orders ~ max)
      const volumeNorm = clamp01(total / 10);

      return { volume: volumeNorm, completion: completionRate };
    }

    // 7) Score each listing
    // Weights (premium-feel but stable):
    // - Budget fit: 0.55
    // - Historical volume: 0.25
    // - Completion rate: 0.20
    function scoreListing(listing) {
      const price = Number(listing.price || 0);
      const fit = budgetFitScore(price);
      const hist = historicalScore(listing.id);

      const score =
        100 *
        (0.55 * fit +
          0.25 * hist.volume +
          0.20 * hist.completion);

      const reasons = [];

      // Reasons for UI
      if (fit >= 0.9) reasons.push("Fits your budget range");
      else if (fit >= 0.6) reasons.push("Near your budget range");
      else reasons.push("Outside your budget range");

      const arr = ordersByListing.get(listing.id) || [];
      if (arr.length >= 3) reasons.push(`Proven package (${arr.length} past orders)`);
      else if (arr.length > 0) reasons.push(`Some history (${arr.length} past orders)`);
      else reasons.push("New package (no past orders yet)");

      if (hist.completion >= 0.8 && arr.length > 0) reasons.push("High completion rate");
      else if (arr.length > 0) reasons.push("Average completion rate");

      // status-based hint if present
      if (String(listing.status || "").toLowerCase() === "active") reasons.push("Active listing");

      return { score: Math.round(score), reasons };
    }

    const candidates = listings.map((l) => {
      const s = scoreListing(l);
      return {
        listingId: l.id,
        title: l.title,
        price: Number(l.price || 0),
        status: l.status || null,
        score: s.score,
        reasons: s.reasons,
      };
    });

    // Prefer active listings if status exists
    candidates.sort((a, b) => {
      const aActive = String(a.status || "").toLowerCase() === "active" ? 1 : 0;
      const bActive = String(b.status || "").toLowerCase() === "active" ? 1 : 0;
      if (bActive !== aActive) return bActive - aActive;
      return (b.score || 0) - (a.score || 0);
    });

    const recommended = candidates[0] || null;
    const alternatives = candidates.slice(0, 5);

    return res.json({
      ok: true,
      campaign: {
        id: campaign.id,
        name: campaign.name,
        minBudget: campaign.minBudget,
        maxBudget: campaign.maxBudget,
      },
      influencerId,
      recommended,
      alternatives,
      note:
        "Smart scoring uses: budget fit + listing order volume + completion rate. Later we can add engagement/category matching without changing this API.",
    });
  } catch (e) {
    console.error("GET /api/brand/campaigns/:id/smart-package ERROR:", e);
    return res.status(500).json({ ok: false, error: e?.message || "Server error" });
  }
});

module.exports = router;
