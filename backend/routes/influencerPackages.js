const express = require("express");
const { prisma } = require("../lib/prisma");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

const ALLOWED_PLATFORMS = ["instagram", "tiktok", "ugc"];

/**
 * GET /api/influencer-packages/public/:userId
 * Public packages for creator profile
 */
router.get("/public/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
    const packages = await prisma.influencerPackage.findMany({
      where: {
        userId,
        isActive: true,
      },
      orderBy: {
        price: "asc",
      },
    });

    res.json(packages);
  } catch (err) {
    console.error("Error fetching influencer packages:", err);
    res.status(500).json({ error: "Failed to fetch packages" });
  }
});

/**
 * GET /api/influencer-packages/mine
 * Packages for logged-in creator
 */
router.get("/mine", requireAuth, async (req, res) => {
  try {
    const packages = await prisma.influencerPackage.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: "desc" },
    });
    res.json(packages);
  } catch (err) {
    console.error("Error fetching my packages:", err);
    res.status(500).json({ error: "Failed to fetch packages" });
  }
});

/**
 * POST /api/influencer-packages
 * Create package (creator only)
 */
router.post("/", requireAuth, async (req, res) => {
  try {
    const { title, platform, price, description } = req.body;
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

/**
 * PATCH /api/influencer-packages/:id
 * Update or toggle package
 */
router.patch("/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, platform, price, description, isActive } = req.body || {};

    const existing = await prisma.influencerPackage.findUnique({ where: { id } });
    if (!existing || existing.userId !== req.user.id) {
      return res.status(404).json({ error: "Package not found" });
    }

    const update = {};
    if (title !== undefined) update.title = String(title).trim();
    if (platform !== undefined) {
      const normalizedPlatform = String(platform || "").toLowerCase();
      if (!ALLOWED_PLATFORMS.includes(normalizedPlatform)) {
        return res.status(400).json({ error: "Invalid platform" });
      }
      update.platform = normalizedPlatform;
    }
    if (price !== undefined) update.price = Number(price);
    if (description !== undefined) update.description = description ? String(description) : null;
    if (isActive !== undefined) update.isActive = Boolean(isActive);

    const updated = await prisma.influencerPackage.update({
      where: { id },
      data: update,
    });

    res.json(updated);
  } catch (err) {
    console.error("Error updating package:", err);
    res.status(500).json({ error: "Failed to update package" });
  }
});

/**
 * DELETE /api/influencer-packages/:id
 * Delete package
 */
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.influencerPackage.findUnique({ where: { id } });
    if (!existing || existing.userId !== req.user.id) {
      return res.status(404).json({ error: "Package not found" });
    }

    await prisma.influencerPackage.delete({ where: { id } });
    res.json({ ok: true });
  } catch (err) {
    console.error("Error deleting package:", err);
    res.status(500).json({ error: "Failed to delete package" });
  }
});

module.exports = router;
