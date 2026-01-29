const express = require("express");
const { requireAuth } = require("../middleware/auth");
const { prisma } = require("../lib/prisma");

const router = express.Router();

/**
 * GET /api/brand/campaigns/:id/suggested
 * Returns suggested influencers based on campaign requirements
 */
router.get("/:id/suggested", requireAuth, async (req, res) => {
  try {
    const brandId = req.user.id;
    const campaignId = String(req.params.id);

    // 1. Load campaign + requirements
    const campaign = await prisma.campaign.findFirst({
      where: { id: campaignId, brandId },
      include: { requirements: true },
    });

    if (!campaign) {
      return res.status(404).json({ ok: false, error: "Campaign not found" });
    }

    const r = campaign.requirements;

    // 2. Build basic filters (safe + optional)
    const where = {
      role: "INFLUENCER",
      ...(r?.minFollowers || r?.maxFollowers
        ? {
            followers: {
              ...(r.minFollowers ? { gte: r.minFollowers } : {}),
              ...(r.maxFollowers ? { lte: r.maxFollowers } : {}),
            },
          }
        : {}),
    };

    // 3. Fetch influencers (basic version)
    const users = await prisma.user.findMany({
      where,
      take: 24,
      select: {
        id: true,
        name: true,
        username: true,
        city: true,
        followers: true,
        categories: true,
        languages: true,
        profileImage: true,
      },
    });

    // 4. Simple scoring (can improve later)
    const suggested = users.map((u) => {
      let score = 0;

      if (r?.categories?.length && u.categories) {
        score += r.categories.filter((c) => u.categories.includes(c)).length * 2;
      }

      if (r?.languages?.length && u.languages) {
        score += r.languages.filter((l) => u.languages.includes(l)).length;
      }

      return {
        id: u.id,
        name: u.name,
        username: u.username,
        image: u.profileImage || null,
        city: u.city || null,
        followers: u.followers || 0,
        categories: u.categories || [],
        languages: u.languages || [],
        score,
      };
    });

    // sort by score desc
    suggested.sort((a, b) => b.score - a.score);

    return res.json({ ok: true, suggested });
  } catch (e) {
    console.error("GET /campaigns/:id/suggested ERROR:", e);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});

module.exports = router;
