const express = require("express");
const { prisma } = require("../lib/prisma");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

const ALLOWED_PLATFORMS = [
  "instagram",
  "tiktok",
  "ugc",
  "youtube",
  "facebook",
  "x",
  "telegram",
  "whatsapp",
];

/**
 * POST /api/packages
 * Create package (creator only)
 */
router.post("/", requireAuth, async (req, res) => {
  try {
    const { title, platform, price, description } = req.body || {};
    const normalizedPlatform = String(platform || "").toLowerCase();

    if (!title || !normalizedPlatform || price === undefined || price === null) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    if (!ALLOWED_PLATFORMS.includes(normalizedPlatform)) {
      return res.status(400).json({ error: "Invalid platform" });
    }

    const created = await prisma.influencerPackage.create({
      data: {
        userId: req.user.id,
        title: String(title).trim(),
        platform: normalizedPlatform,
        price: Number(price),
        description: description ? String(description) : null,
      },
    });

    res.json(created);
  } catch (err) {
    console.error("Error creating package:", err);
    res.status(500).json({ error: "Failed to create package" });
  }
});

module.exports = router;
