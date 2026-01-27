const express = require("express");
const { prisma } = require("../lib/prisma");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

const ALLOWED_STATUSES = ["PENDING", "ACCEPTED", "REJECTED", "COMPLETED", "PAID", "CANCELLED"];

async function createCreatorEarningIfNeeded(order) {
  if (!order) return null;

  const pkg = await prisma.influencerPackage.findUnique({
    where: { id: order.listingId },
  });
  if (!pkg) return null;

  const existing = await prisma.creatorEarning.findFirst({
    where: { orderId: order.id },
  });
  if (existing) return existing;

  const grossAmount = Number(order.totalPrice || 0);
  const platformFee = Number((grossAmount * 0.1).toFixed(2));
  const netAmount = Number((grossAmount - platformFee).toFixed(2));

  return prisma.creatorEarning.create({
    data: {
      creatorId: pkg.userId,
      orderId: order.id,
      packageId: pkg.id,
      grossAmount,
      platformFee,
      netAmount,
    },
  });
}

function getClientIp(req) {
  const header = req.headers["x-forwarded-for"];
  if (typeof header === "string" && header.length) {
    return header.split(",")[0].trim();
  }
  return req.ip || null;
}

async function incrementOrderAnalytics({ packageId, userId, ipAddress }) {
  await prisma.$transaction([
    prisma.influencerPackageAnalytics.upsert({
      where: { packageId },
      create: { packageId, orders: 1 },
      update: { orders: { increment: 1 } },
    }),
    prisma.influencerPackageEvent.create({
      data: {
        packageId,
        eventType: "order_created",
        userId,
        ipAddress,
      },
    }),
  ]);
}

async function ensureListingForPackage(pkg) {
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

  return { seller, listing };
}

/**
 * POST /api/orders
 * Create order from selected package
 */
router.post("/", requireAuth, async (req, res) => {
  try {
    const { packageId, fromCart } = req.body || {};
    const buyerId = req.user?.id;

    if (!buyerId) {
      return res.status(401).json({ error: "Login required" });
    }

    if (!packageId && !fromCart) {
      return res.status(400).json({ error: "Package id is required" });
    }

    const ipAddress = getClientIp(req);

    if (packageId) {
      const pkg = await prisma.influencerPackage.findUnique({
        where: { id: packageId },
      });

      if (!pkg || !pkg.isActive) {
        return res.status(404).json({ error: "Package not available" });
      }

      const { seller, listing } = await ensureListingForPackage(pkg);

      const order = await prisma.order.create({
        data: {
          buyerId,
          sellerId: seller.id,
          listingId: listing.id,
          status: "PENDING",
          totalPrice: pkg.price,
        },
      });

      await incrementOrderAnalytics({ packageId: pkg.id, userId: buyerId, ipAddress });
      return res.json(order);
    }

    const cartItems = await prisma.cart.findMany({
      where: { userId: buyerId },
      include: { package: true },
    });

    if (!cartItems.length) {
      return res.status(400).json({ error: "Cart is empty" });
    }

    const createdOrders = [];

    for (const item of cartItems) {
      const pkg = item.package;
      if (!pkg || !pkg.isActive) continue;
      const quantity = Math.max(1, Number(item.quantity || 1));
      const { seller, listing } = await ensureListingForPackage(pkg);
      const order = await prisma.order.create({
        data: {
          buyerId,
          sellerId: seller.id,
          listingId: listing.id,
          status: "PENDING",
          totalPrice: pkg.price * quantity,
        },
      });
      createdOrders.push(order);
      await incrementOrderAnalytics({ packageId: pkg.id, userId: buyerId, ipAddress });
    }

    if (!createdOrders.length) {
      return res.status(400).json({ error: "No valid packages in cart" });
    }

    await prisma.cart.deleteMany({ where: { userId: buyerId } });

    res.json({ ok: true, orders: createdOrders });
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
 * GET /api/orders/:id
 * Fetch single order (buyer or seller)
 */
router.get("/:id", requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ error: "Login required" });
    }

    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) return res.status(404).json({ error: "Order not found" });

    if (order.buyerId !== userId && order.sellerId !== userId) {
      return res.status(403).json({ error: "Not allowed" });
    }

    const pkg = await prisma.influencerPackage.findUnique({
      where: { id: order.listingId },
    });

    return res.json({ ...order, package: pkg || null });
  } catch (err) {
    console.error("Fetch order error:", err);
    res.status(500).json({ error: "Failed to fetch order" });
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

    if (normalized === "COMPLETED") {
      await createCreatorEarningIfNeeded(updated);
      try {
        await prisma.analyticsEvent.create({
          data: {
            entity: "PACKAGE",
            entityId: updated.listingId,
            event: "ORDER",
          },
        });
      } catch {}
    }

    res.json(updated);
  } catch (err) {
    console.error("Update order error:", err);
    res.status(500).json({ error: "Failed to update order" });
  }
});

module.exports = router;
