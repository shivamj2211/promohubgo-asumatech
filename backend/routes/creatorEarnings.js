const express = require("express");
const { prisma } = require("../lib/prisma");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    const creatorId = req.user?.id;
    if (!creatorId) return res.status(401).json({ error: "Login required" });

    const earnings = await prisma.creatorEarning.findMany({
      where: { creatorId },
      orderBy: { createdAt: "desc" },
    });

    const orderIds = earnings.map((e) => e.orderId);
    const packageIds = earnings.map((e) => e.packageId);

    const [orders, packages] = await Promise.all([
      prisma.order.findMany({ where: { id: { in: orderIds } } }),
      prisma.influencerPackage.findMany({ where: { id: { in: packageIds } } }),
    ]);

    const orderMap = new Map(orders.map((o) => [o.id, o]));
    const packageMap = new Map(packages.map((p) => [p.id, p]));

    const totals = earnings.reduce(
      (acc, e) => {
        acc.gross += e.grossAmount || 0;
        acc.fees += e.platformFee || 0;
        acc.net += e.netAmount || 0;
        return acc;
      },
      { gross: 0, fees: 0, net: 0 }
    );

    const items = earnings.map((e) => ({
      ...e,
      order: orderMap.get(e.orderId) || null,
      package: packageMap.get(e.packageId) || null,
    }));

    return res.json({ ok: true, totals, items });
  } catch (err) {
    console.error("Fetch earnings error:", err);
    return res.status(500).json({ error: "Failed to fetch earnings" });
  }
});

module.exports = router;
