const express = require("express");
const { prisma } = require("../lib/prisma");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

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

router.get("/:orderId", requireAuth, async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) return res.status(404).json({ error: "Order not found" });
    if (order.buyerId !== req.user.id && order.sellerId !== req.user.id) {
      return res.status(403).json({ error: "Not allowed" });
    }

    const payment = await prisma.payment.findUnique({ where: { orderId } });
    return res.json({ ok: true, payment: payment || null });
  } catch (err) {
    console.error("Fetch payment error:", err);
    return res.status(500).json({ error: "Failed to fetch payment" });
  }
});

/**
 * POST /api/payments/mock/:orderId
 * Mock pay now success
 */
router.post("/mock/:orderId", requireAuth, async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) return res.status(404).json({ error: "Order not found" });

    if (order.buyerId !== req.user.id) {
      return res.status(403).json({ error: "Only buyer can pay" });
    }

    const payment = await prisma.payment.upsert({
      where: { orderId },
      update: {
        status: "SUCCESS",
        provider: "MOCK",
        amount: Number(order.totalPrice || 0),
      },
      create: {
        orderId,
        status: "SUCCESS",
        provider: "MOCK",
        amount: Number(order.totalPrice || 0),
        currency: "INR",
      },
    });

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: { status: "PAID" },
    });

    await createCreatorEarningIfNeeded(updatedOrder);

    return res.json({ ok: true, payment, order: updatedOrder });
  } catch (err) {
    console.error("Mock payment error:", err);
    return res.status(500).json({ error: "Payment failed" });
  }
});

module.exports = router;
