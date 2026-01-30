const express = require("express");
const { requireAuth } = require("../middleware/auth");
const { prisma } = require("../lib/prisma");

const router = express.Router();

/**
 * POST /api/brand/campaigns/:id/invite
 * Body: { influencerId, message? }
 */
router.post("/:id/invite", requireAuth, async (req, res) => {
  try {
    const brandId = req.user.id;
    const campaignId = String(req.params.id);
    const { influencerId, message } = req.body || {};

    if (!influencerId) {
      return res.status(400).json({ ok: false, error: "influencerId is required" });
    }

    // 1️⃣ Ensure campaign belongs to brand
    const campaign = await prisma.campaign.findFirst({
      where: { id: campaignId, brandId },
    });

    if (!campaign) {
      return res.status(404).json({ ok: false, error: "Campaign not found" });
    }

    // 2️⃣ Ensure influencer exists
    const influencer = await prisma.user.findUnique({
      where: { id: influencerId },
      select: { id: true, name: true, username: true },
    });

    if (!influencer) {
      return res.status(404).json({ ok: false, error: "Influencer not found" });
    }

    // 3️⃣ Create or reuse inbox thread
    // Rule: one thread per (brand ↔ influencer)
    let thread = await prisma.thread.findFirst({
      where: {
        participants: {
          every: {
            userId: { in: [brandId, influencerId] },
          },
        },
      },
    });

    if (!thread) {
      thread = await prisma.thread.create({
        data: {
          participants: {
            create: [
              { userId: brandId },
              { userId: influencerId },
            ],
          },
        },
      });
    }

    // 4️⃣ Upsert CampaignInfluencer (idempotent)
    const link = await prisma.campaignInfluencer.upsert({
      where: {
        campaignId_influencerId: {
          campaignId,
          influencerId,
        },
      },
      create: {
        campaignId,
        influencerId,
        status: "invited",
        threadId: thread.id,
        lastNote: message || null,
        invitedAt: new Date(),
      },
      update: {
        status: "invited",
        threadId: thread.id,
        lastNote: message || undefined,
        invitedAt: new Date(),
      },
    });

    // 5️⃣ Send first message (optional)
    if (message && message.trim()) {
      await prisma.message.create({
        data: {
          threadId: thread.id,
          senderId: brandId,
          body: message.trim(),
          meta: {
            type: "campaign_invite",
            campaignId,
          },
        },
      });
    }

    return res.json({
      ok: true,
      invite: {
        id: link.id,
        status: link.status,
        threadId: thread.id,
        influencer: {
          id: influencer.id,
          name: influencer.name,
          username: influencer.username,
        },
      },
    });
  } catch (e) {
    console.error("POST /campaigns/:id/invite ERROR:", e);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});

module.exports = router;
