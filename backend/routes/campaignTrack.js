const express = require("express");
const { prisma } = require("../lib/prisma");

const router = express.Router();

/**
 * POST /api/track/campaign/view
 * Body: { campaignId }
 */
router.post("/campaign/view", async (req, res) => {
  try {
    const { campaignId } = req.body || {};
    if (!campaignId) return res.status(400).json({ ok: false });

    await prisma.campaignStats.upsert({
      where: { campaignId },
      create: { campaignId, views: 1 },
      update: { views: { increment: 1 } },
    });

    return res.json({ ok: true });
  } catch {
    return res.json({ ok: true }); // silent fail (tracking must never break UX)
  }
});

/**
 * POST /api/track/campaign/click
 */
router.post("/campaign/click", async (req, res) => {
  try {
    const { campaignId } = req.body || {};
    if (!campaignId) return res.status(400).json({ ok: false });

    await prisma.campaignStats.upsert({
      where: { campaignId },
      create: { campaignId, clicks: 1 },
      update: { clicks: { increment: 1 } },
    });

    return res.json({ ok: true });
  } catch {
    return res.json({ ok: true });
  }
});

/**
 * POST /api/track/campaign/save
 */
router.post("/campaign/save", async (req, res) => {
  try {
    const { campaignId } = req.body || {};
    if (!campaignId) return res.status(400).json({ ok: false });

    await prisma.campaignStats.upsert({
      where: { campaignId },
      create: { campaignId, saves: 1 },
      update: { saves: { increment: 1 } },
    });

    return res.json({ ok: true });
  } catch {
    return res.json({ ok: true });
  }
});

/**
 * POST /api/track/campaign/order
 */
router.post("/campaign/order", async (req, res) => {
  try {
    const { campaignId } = req.body || {};
    if (!campaignId) return res.status(400).json({ ok: false });

    await prisma.campaignStats.upsert({
      where: { campaignId },
      create: { campaignId, orders: 1 },
      update: { orders: { increment: 1 } },
    });

    return res.json({ ok: true });
  } catch {
    return res.json({ ok: true });
  }
});

module.exports = router;
