const express = require("express");
const { requireAuth } = require("../middleware/auth");
const { prisma } = require("../lib/prisma");

const router = express.Router();

/**
 * GET /api/brand/campaigns/:id/analytics
 */
router.get("/:id/analytics", requireAuth, async (req, res) => {
  try {
    const brandId = req.user.id;
    const campaignId = String(req.params.id);

    // 1️⃣ Ensure campaign belongs to brand
    const campaign = await prisma.campaign.findFirst({
      where: { id: campaignId, brandId },
      select: { id: true, name: true },
    });

    if (!campaign) {
      return res.status(404).json({ ok: false, error: "Campaign not found" });
    }

    // 2️⃣ Load stats (auto-create if missing)
    const stats = await prisma.campaignStats.upsert({
      where: { campaignId },
      create: { campaignId },
      update: {},
    });

    // 3️⃣ Funnel counts
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

    for (const f of funnelRaw) {
      funnel[f.status] = f._count.status;
    }

    return res.json({
      ok: true,
      analytics: {
        stats: {
          views: stats.views,
          clicks: stats.clicks,
          saves: stats.saves,
          orders: stats.orders,
        },
        funnel,
      },
    });
  } catch (e) {
    console.error("GET /campaigns/:id/analytics ERROR:", e);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});

module.exports = router;
