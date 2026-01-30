const express = require("express");
const { requireAuth } = require("../middleware/auth");
const { prisma } = require("../lib/prisma");

const router = express.Router();

/**
 * GET /api/brand/campaigns/:id/roi
 *
 * Returns:
 * - Spend / Orders summary
 * - Funnel counts (invited/applied/approved/completed etc)
 * - Creator-wise breakdown (spend, orders, avg order value, status)
 *
 * NOTE:
 * - Your Order.sellerId is Seller.id (NOT User.id)
 * - Your CampaignInfluencer.influencerId is User.id
 * - Listing.sellerId is Seller.id
 */
router.get("/:id/roi", requireAuth, async (req, res) => {
  try {
    const brandId = req.user.id;
    const campaignId = String(req.params.id);

    // 1) Ensure campaign belongs to brand
    const campaign = await prisma.campaign.findFirst({
      where: { id: campaignId, brandId },
      select: { id: true, name: true, createdAt: true, status: true },
    });
    if (!campaign) return res.status(404).json({ ok: false, error: "Campaign not found" });

    // 2) Funnel counts from CampaignInfluencer
    const funnelRaw = await prisma.campaignInfluencer.groupBy({
      by: ["status"],
      where: { campaignId },
      _count: { status: true },
    });

    const funnel = {
      invited: 0,
      applied: 0,
      approved: 0,
      rejected: 0,
      completed: 0,
      withdrawn: 0,
    };

    for (const row of funnelRaw) {
      const key = String(row.status || "").toLowerCase();
      if (funnel[key] !== undefined) funnel[key] = row._count.status;
    }

    // 3) Fetch campaign orders (campaign-based)
    // IMPORTANT: these fields must exist on Order: campaignId + orderType
    const orders = await prisma.order.findMany({
      where: {
        campaignId,
        orderType: "campaign",
      },
      orderBy: { createdAt: "desc" },
      include: {
        listing: { select: { id: true, title: true, price: true } },
        seller: {
          select: {
            id: true,
            userId: true,
            user: { select: { id: true, name: true, username: true, image: true } },
          },
        },
      },
    });

    const spend = orders.reduce((sum, o) => sum + (Number(o.totalPrice) || 0), 0);

    const orderStats = {
      total: orders.length,
      pending: orders.filter((o) => String(o.status).toLowerCase() === "pending").length,
      completed: orders.filter((o) => String(o.status).toLowerCase() === "completed").length,
      cancelled: orders.filter((o) => String(o.status).toLowerCase() === "cancelled").length,
    };

    const avgOrderValue = orderStats.total ? spend / orderStats.total : 0;
    const costPerApproved = funnel.approved ? spend / funnel.approved : 0;
    const costPerOrder = orderStats.total ? spend / orderStats.total : 0;

    // 4) Map statuses per creator (User.id -> status) from CampaignInfluencer
    const links = await prisma.campaignInfluencer.findMany({
      where: { campaignId },
      select: { influencerId: true, status: true, packageId: true, createdAt: true },
    });

    const statusByInfluencer = new Map();
    const pkgByInfluencer = new Map();
    for (const l of links) {
      statusByInfluencer.set(l.influencerId, String(l.status || "").toLowerCase());
      if (l.packageId) pkgByInfluencer.set(l.influencerId, l.packageId);
    }

    // 5) Creator-wise breakdown (group by Seller.userId == CampaignInfluencer.influencerId)
    const group = new Map();

    for (const o of orders) {
      const sellerUserId = o?.seller?.userId; // User.id
      if (!sellerUserId) continue;

      if (!group.has(sellerUserId)) {
        group.set(sellerUserId, {
          influencerId: sellerUserId,
          sellerId: o.seller.id,
          name: o.seller.user?.name || "Creator",
          username: o.seller.user?.username || null,
          image: o.seller.user?.image || null,

          status: statusByInfluencer.get(sellerUserId) || "unknown",
          selectedPackageId: pkgByInfluencer.get(sellerUserId) || null,

          orders: 0,
          spend: 0,
          listings: new Map(), // listingId -> {title, price, count}
        });
      }

      const item = group.get(sellerUserId);
      item.orders += 1;
      item.spend += Number(o.totalPrice) || 0;

      if (o.listing?.id) {
        const lid = o.listing.id;
        if (!item.listings.has(lid)) {
          item.listings.set(lid, { listingId: lid, title: o.listing.title, price: o.listing.price, count: 0 });
        }
        item.listings.get(lid).count += 1;
      }
    }

    const creators = Array.from(group.values()).map((c) => {
      const listingArr = Array.from(c.listings.values());
      const avg = c.orders ? c.spend / c.orders : 0;

      return {
        influencerId: c.influencerId,
        sellerId: c.sellerId,
        name: c.name,
        username: c.username,
        image: c.image,
        status: c.status,
        selectedPackageId: c.selectedPackageId,

        orders: c.orders,
        spend: Math.round(c.spend),
        avgOrderValue: Math.round(avg),

        topListings: listingArr
          .sort((a, b) => b.count - a.count)
          .slice(0, 3)
          .map((x) => ({
            listingId: x.listingId,
            title: x.title,
            price: x.price,
            count: x.count,
          })),
      };
    });

    // Sort creators by spend desc
    creators.sort((a, b) => (b.spend || 0) - (a.spend || 0));

    // 6) “ROI-like” efficiency (since real revenue not tracked yet)
    // These are premium-feel metrics brands understand:
    const efficiency = {
      spendPerOrder: Math.round(costPerOrder),
      spendPerApprovedCreator: Math.round(costPerApproved),
      clickToOrder: funnel.approved ? (orderStats.total / funnel.approved) : 0,
    };

    return res.json({
      ok: true,
      campaign: {
        id: campaign.id,
        name: campaign.name,
        status: campaign.status,
        createdAt: campaign.createdAt,
      },
      roi: {
        spend: Math.round(spend),
        orders: orderStats,
        avgOrderValue: Math.round(avgOrderValue),
        funnel,
        efficiency,
        creators,
      },
    });
  } catch (e) {
    console.error("GET /api/brand/campaigns/:id/roi ERROR:", e);
    return res.status(500).json({ ok: false, error: e?.message || "Server error" });
  }
});

module.exports = router;
