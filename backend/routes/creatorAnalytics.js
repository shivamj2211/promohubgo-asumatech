const express = require("express");
const { prisma } = require("../lib/prisma");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Login required" });

    const packages = await prisma.influencerPackage.findMany({
      where: { userId },
      select: { id: true, title: true, platform: true, price: true },
    });

    const packageIds = packages.map((p) => p.id);

    const events = await prisma.analyticsEvent.groupBy({
      by: ["entity", "entityId", "event"],
      where: {
        OR: [
          { entity: "PROFILE", entityId: userId },
          { entity: "PACKAGE", entityId: { in: packageIds } },
        ],
      },
      _count: { _all: true },
    });

    const totals = { views: 0, clicks: 0, saves: 0, orders: 0 };
    const perPackage = new Map(
      packages.map((pkg) => [
        pkg.id,
        {
          packageId: pkg.id,
          title: pkg.title,
          platform: pkg.platform,
          price: pkg.price,
          views: 0,
          clicks: 0,
          saves: 0,
          orders: 0,
        },
      ])
    );

    for (const row of events) {
      const count = row._count?._all || 0;
      if (row.entity === "PROFILE") {
        if (row.event === "VIEW") totals.views += count;
        if (row.event === "CLICK") totals.clicks += count;
        if (row.event === "SAVE") totals.saves += count;
        if (row.event === "ORDER") totals.orders += count;
      } else if (row.entity === "PACKAGE") {
        const entry = perPackage.get(row.entityId);
        if (!entry) continue;
        if (row.event === "VIEW") {
          entry.views += count;
          totals.views += count;
        }
        if (row.event === "CLICK") {
          entry.clicks += count;
          totals.clicks += count;
        }
        if (row.event === "SAVE") {
          entry.saves += count;
          totals.saves += count;
        }
        if (row.event === "ORDER") {
          entry.orders += count;
          totals.orders += count;
        }
      }
    }

    return res.json({
      ok: true,
      totals,
      packages: Array.from(perPackage.values()),
    });
  } catch (err) {
    console.error("Fetch creator analytics error:", err);
    return res.status(500).json({ error: "Failed to fetch analytics" });
  }
});

module.exports = router;
