const express = require("express");
const { requireAuth } = require("../middleware/auth");
const { prisma } = require("../lib/prisma");

const router = express.Router();

/**
 * PATCH /api/brand/campaigns/:id/influencers/:influencerId
 * Body:
 * {
 *   status: "approved" | "rejected" | "completed" | "invited" | "applied" | "withdrawn",
 *   note?: string,
 *   packageId?: string   // REQUIRED when approving
 * }
 */
router.patch("/:id/influencers/:influencerId", requireAuth, async (req, res) => {
  try {
    const brandId = req.user.id;
    const campaignId = String(req.params.id);
    const influencerId = String(req.params.influencerId);

    const status = String(req.body?.status || "").toLowerCase();
    const note = req.body?.note ? String(req.body.note) : null;
    const packageId = req.body?.packageId ? String(req.body.packageId) : null;

    const allowed = new Set(["invited", "applied", "approved", "rejected", "completed", "withdrawn"]);
    if (!allowed.has(status)) {
      return res.status(400).json({ ok: false, error: "Invalid status" });
    }

    // 1) Ensure campaign belongs to brand
    const campaign = await prisma.campaign.findFirst({
      where: { id: campaignId, brandId },
      select: { id: true, name: true },
    });
    if (!campaign) return res.status(404).json({ ok: false, error: "Campaign not found" });

    // 2) Ensure link exists
    const existing = await prisma.campaignInfluencer.findUnique({
      where: { campaignId_influencerId: { campaignId, influencerId } },
    });
    if (!existing) {
      return res.status(404).json({ ok: false, error: "Creator is not part of this campaign" });
    }

    // 3) Guard transitions
    const from = String(existing.status || "").toLowerCase();

    const allowedTransitions = {
      invited: new Set(["invited", "applied", "approved", "rejected"]),
      applied: new Set(["applied", "approved", "rejected", "withdrawn"]),
      approved: new Set(["approved", "completed", "rejected"]),
      rejected: new Set(["rejected"]),
      completed: new Set(["completed"]),
      withdrawn: new Set(["withdrawn"]),
    };

    if (allowedTransitions[from] && !allowedTransitions[from].has(status)) {
      return res.status(400).json({ ok: false, error: `Invalid transition ${from} → ${status}` });
    }

    const now = new Date();

    // 4) APPROVAL FLOW
    if (status === "approved") {
      if (!packageId) {
        return res.status(400).json({ ok: false, error: "packageId is required to approve a creator" });
      }

      // 4.1 Validate package/listing + ensure listing belongs to THIS influencer (via Seller.userId)
      const listing = await prisma.listing.findUnique({
        where: { id: packageId },
        select: {
          id: true,
          price: true,
          sellerId: true,
          title: true,
          seller: { select: { userId: true } },
        },
      });

      if (!listing) return res.status(404).json({ ok: false, error: "Selected package not found" });

      // ✅ IMPORTANT FIX:
      // listing.sellerId is Seller.id, influencerId is User.id
      // So compare listing.seller.userId with influencerId
      if (!listing.seller || String(listing.seller.userId) !== String(influencerId)) {
        return res.status(400).json({ ok: false, error: "Selected package does not belong to this creator" });
      }

      // 4.2 Update CampaignInfluencer
      const updated = await prisma.campaignInfluencer.update({
        where: { campaignId_influencerId: { campaignId, influencerId } },
        data: {
          status: "approved",
          approvedAt: now,
          packageId,
          ...(note ? { lastNote: note } : {}),
        },
      });

      // 4.3 Idempotent order creation: if already exists, return it
      const existingOrder = await prisma.order.findFirst({
        where: {
          orderType: "campaign",
          campaignLinkId: updated.id,
        },
        select: { id: true, status: true },
      });

      let order = null;

      if (existingOrder) {
        order = existingOrder;
      } else {
        order = await prisma.order.create({
          data: {
            // ✅ these fields were added in schema step
            orderType: "campaign",
            campaignId,
            campaignLinkId: updated.id,

            listingId: listing.id,
            buyerId: brandId,
            sellerId: listing.sellerId, // Seller.id
            totalPrice: listing.price,

            status: "pending",
          },
          select: { id: true, status: true },
        });
      }

      // 4.4 Inbox message
      if (updated.threadId) {
        const body = note?.trim()
          ? `✅ You are approved for "${campaign.name}".\n\nOrder #${order.id}\n\nNote: ${note.trim()}`
          : `✅ You are approved for "${campaign.name}".\n\nOrder #${order.id} has been created using the selected package.`;

        await prisma.message.create({
          data: {
            threadId: updated.threadId,
            senderId: brandId,
            body,
            meta: {
              type: "campaign_approved",
              campaignId,
              influencerId,
              orderId: order.id,
              packageId: listing.id,
            },
          },
        });
      }

      return res.json({ ok: true, link: updated, orderId: order.id });
    }

    // 5) NON-APPROVAL STATUS UPDATE (existing behavior)
    const patch = { status };

    if (status === "invited") patch.invitedAt = now;
    if (status === "applied") patch.appliedAt = now;
    if (status === "completed") patch.completedAt = now;
    if (note) patch.lastNote = note;

    const updated = await prisma.campaignInfluencer.update({
      where: { campaignId_influencerId: { campaignId, influencerId } },
      data: patch,
    });

    // 6) System message (non-approval)
    if (updated.threadId) {
      const textMap = {
        rejected: `❌ Your application for "${campaign.name}" was not selected.`,
        completed: `🎉 Campaign "${campaign.name}" marked as completed.`,
        invited: `📩 You have been invited to "${campaign.name}".`,
        applied: `📩 Creator applied for "${campaign.name}".`,
        withdrawn: `⚠️ Creator withdrew from "${campaign.name}".`,
      };

      const body = note?.trim()
        ? `${textMap[status] || `Status updated to ${status}.`}\n\nNote: ${note.trim()}`
        : textMap[status] || `Status updated to ${status}.`;

      await prisma.message.create({
        data: {
          threadId: updated.threadId,
          senderId: brandId,
          body,
          meta: { type: "campaign_status", campaignId, influencerId, status },
        },
      });
    }

    return res.json({ ok: true, link: updated });
  } catch (e) {
    console.error("PATCH /brand/campaigns/:id/influencers/:influencerId ERROR:", e);
    return res.status(500).json({ ok: false, error: e?.message || "Server error" });
  }
});

module.exports = router;
