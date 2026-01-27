const express = require("express");
const { prisma } = require("../lib/prisma");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

/**
 * POST /api/cart/add
 * Add package to cart (increment quantity if exists)
 */
router.post("/add", requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Login required" });
    }

    const { packageId, quantity } = req.body || {};
    const qty = Math.max(1, Number.parseInt(quantity, 10) || 1);

    if (!packageId) {
      return res.status(400).json({ error: "Package id is required" });
    }

    const pkg = await prisma.influencerPackage.findUnique({
      where: { id: packageId },
    });
    if (!pkg || !pkg.isActive) {
      return res.status(404).json({ error: "Package not available" });
    }

    const item = await prisma.cart.upsert({
      where: {
        userId_packageId: {
          userId,
          packageId,
        },
      },
      update: {
        quantity: { increment: qty },
      },
      create: {
        userId,
        packageId,
        quantity: qty,
      },
    });

    res.json({ ok: true, item });
  } catch (err) {
    console.error("Add to cart error:", err);
    res.status(500).json({ error: "Failed to add to cart" });
  }
});

/**
 * GET /api/cart
 * Get cart items for user
 */
router.get("/", requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Login required" });
    }

    const items = await prisma.cart.findMany({
      where: { userId },
      include: {
        package: true,
      },
      orderBy: { id: "desc" },
    });

    res.json({
      ok: true,
      items,
    });
  } catch (err) {
    console.error("Fetch cart error:", err);
    res.status(500).json({ error: "Failed to fetch cart" });
  }
});

/**
 * PATCH /api/cart/:id
 * Update cart item quantity
 */
router.patch("/:id", requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Login required" });
    }

    const { id } = req.params;
    const { quantity } = req.body || {};
    const qty = Number.parseInt(quantity, 10);

    if (!Number.isFinite(qty) || qty < 1) {
      return res.status(400).json({ error: "Quantity must be at least 1" });
    }

    const existing = await prisma.cart.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId) {
      return res.status(404).json({ error: "Cart item not found" });
    }

    const updated = await prisma.cart.update({
      where: { id },
      data: { quantity: qty },
      include: { package: true },
    });

    res.json({ ok: true, item: updated });
  } catch (err) {
    console.error("Update cart error:", err);
    res.status(500).json({ error: "Failed to update cart" });
  }
});

/**
 * DELETE /api/cart/:id
 * Remove cart item
 */
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Login required" });
    }

    const { id } = req.params;
    const existing = await prisma.cart.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId) {
      return res.status(404).json({ error: "Cart item not found" });
    }

    await prisma.cart.delete({ where: { id } });
    res.json({ ok: true });
  } catch (err) {
    console.error("Delete cart item error:", err);
    res.status(500).json({ error: "Failed to remove cart item" });
  }
});

module.exports = router;
