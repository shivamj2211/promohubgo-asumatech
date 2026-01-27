const express = require("express");
const { prisma } = require("../lib/prisma");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

const ALLOWED_STATUSES = ["PENDING", "ACCEPTED", "PAID", "COMPLETED", "CANCELLED"];

/**
 * POST /api/orders
 * Create order from selected package
 */
router.post("/", requireAuth, async (req, res) => {
  try {
    const { packageId } = req.body;
    const buyerId = req.user?.id;

    if (!buyerId) {
      return res.status(401).json({ error: "Login required" });
    }

    if (!packageId) {
      return res.status(400).json({ error: "Package id is required" });
    }

    const pkg = await prisma.influencerPackage.findUnique({
      where: { id: packageId },
    });

    if (!pkg || !pkg.isActive) {
      return res.status(404).json({ error: "Package not available" });
    }

    const seller = await prisma.seller.upsert({
      where: { userId: pkg.userId },
      update: {},
      create: {
        userId: pkg.userId,
        bio: "Influencer package seller",
      },
    });

    const category = await prisma.category.upsert({
      where: { slug: "influencer-package" },
      update: {},
      create: { name: "Influencer Package", slug: "influencer-package" },
    });

    const listing = await prisma.listing.upsert({
      where: { id: pkg.id },
      update: {
        title: pkg.title,
        description: pkg.description || "",
        price: pkg.price,
        sellerId: seller.id,
        categoryId: category.id,
      },
      create: {
        id: pkg.id,
        title: pkg.title,
        description: pkg.description || "Influencer package",
        price: pkg.price,
        sellerId: seller.id,
        categoryId: category.id,
      },
    });

    const order = await prisma.order.create({
      data: {
        buyerId,
        sellerId: seller.id,
        listingId: listing.id,
        status: "PENDING",
        totalPrice: pkg.price,
      },
    });

    res.json(order);
  } catch (err) {
    console.error("Create order error:", err);
    res.status(500).json({ error: "Failed to create order" });
  }
});

/**
 * GET /api/orders/mine
 * Buyer & Seller orders
 */
router.get("/mine", requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: "Login required" });
    }

    const orders = await prisma.order.findMany({
      where: {
        OR: [{ buyerId: userId }, { sellerId: userId }],
      },
      orderBy: { createdAt: "desc" },
    });

    const packageIds = [...new Set(orders.map((order) => order.listingId))];
    const packages = await prisma.influencerPackage.findMany({
      where: { id: { in: packageIds } },
    });
    const packageMap = new Map(packages.map((pkg) => [pkg.id, pkg]));

    const hydrated = orders.map((order) => ({
      ...order,
      package: packageMap.get(order.listingId) || null,
    }));

    res.json(hydrated);
  } catch (err) {
    console.error("Fetch orders error:", err);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

/**
 * PATCH /api/orders/:id
 * Update order status
 */
router.patch("/:id", requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    const { status } = req.body || {};

    if (!userId) {
      return res.status(401).json({ error: "Login required" });
    }

    const normalized = String(status || "").toUpperCase();
    if (!ALLOWED_STATUSES.includes(normalized)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const existing = await prisma.order.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: "Order not found" });
    }

    if (existing.buyerId !== userId && existing.sellerId !== userId) {
      return res.status(403).json({ error: "Not allowed" });
    }

    const updated = await prisma.order.update({
      where: { id },
      data: { status: normalized },
    });

    res.json(updated);
  } catch (err) {
    console.error("Update order error:", err);
    res.status(500).json({ error: "Failed to update order" });
  }
});

module.exports = router;
