const express = require("express");
const { requireAuth } = require("../middleware/auth");
const { prisma } = require("../lib/prisma");

const router = express.Router();

/**
 * POST /api/creator/campaigns/:id/apply
 * Body: { message? }
 */
router.post("/:id/apply", requireAuth, async (req, res) => {
  try {
    const creatorId = req.user.id;
    const campaignId = String(req.params.id);
    const { message } = req.body || {};

    // 1️⃣ Ensure creator role
    const me = await prisma.user.findUnique({
      where: { id: creatorId },
      select: { role: true },
    });

    if (!me || String(me.role).toUpperCase() !== "INFLUENCER") {
      return res.status(403).json({ ok: false, error: "Only creators can apply" });
    }

    // 2️⃣ Ensure campaign exists & is live
    const campaign = await prisma.campaign.findFirst({
      where: { id: campaignId, status: "live" },
      select: { id: true, brandId: true, name: true },
    });

    if (!campaign) {
      return res.status(404).json({ ok: false, error: "Campaign not found or not live" });
    }

    // 3️⃣ Create or reuse inbox thread (brand ↔ creator)
    let thread = await prisma.thread.findFirst({
      where: {
        participants: {
          every: {
            userId: { in: [campaign.brandId, creatorId] },
          },
        },
      },
    });

    if (!thread) {
      thread = await prisma.thread.create({
        data: {
          participants: {
            create: [
              { userId: campaign.brandId },
              { userId: creatorId },
            ],
          },
        },
      });
    }

    // 4️⃣ Upsert CampaignInfluencer
    const link = await prisma.campaignInfluencer.upsert({
      where: {
        campaignId_influencerId: {
          campaignId,
          influencerId: creatorId,
        },
      },
      create: {
        campaignId,
        influencerId: creatorId,
        status: "applied",
        threadId: thread.id,
        appliedAt: new Date(),
        lastNote: message || null,
      },
      update: {
        status: "applied",
        appliedAt: new Date(),
        threadId: thread.id,
        lastNote: message || undefined,
      },
    });

    // 5️⃣ Send message to brand (optional but premium)
    const body =
      message?.trim() ||
      `Hi! I’m interested in collaborating on "${campaign.name}". Please let me know next steps.`;

    await prisma.message.create({
      data: {
        threadId: thread.id,
        senderId: creatorId,
        body,
        meta: {
          type: "campaign_apply",
          campaignId,
        },
      },
    });

    return res.json({
      ok: true,
      application: {
        id: link.id,
        status: link.status,
        threadId: thread.id,
        campaignId,
      },
    });
  } catch (e) {
    console.error("POST /creator/campaigns/:id/apply ERROR:", e);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});

module.exports = router;
