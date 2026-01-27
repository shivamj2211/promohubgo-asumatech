const express = require("express");
const jwt = require("jsonwebtoken");
const { prisma } = require("../lib/prisma");
const { requireAuth } = require("../middleware/auth");
const { COOKIE_NAME } = require("../utils/jwt");

const router = express.Router();

const EVENT_TYPES = ["profile_view", "package_click", "package_save", "order_created"];
const EVENT_TO_ANALYTICS = {
  profile_view: { entity: "PROFILE", event: "VIEW" },
  package_click: { entity: "PACKAGE", event: "CLICK" },
  package_save: { entity: "PACKAGE", event: "SAVE" },
  order_created: { entity: "PACKAGE", event: "ORDER" },
};

function getOptionalUserId(req) {
  try {
    const token =
      req.cookies?.[COOKIE_NAME] ||
      (req.headers.authorization?.startsWith("Bearer ")
        ? req.headers.authorization.slice(7)
        : null);

    if (!token) return null;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded?.userId || null;
  } catch {
    return null;
  }
}

function getClientIp(req) {
  const header = req.headers["x-forwarded-for"];
  if (typeof header === "string" && header.length) {
    return header.split(",")[0].trim();
  }
  return req.ip || null;
}

/**
 * POST /api/analytics/track
 * Track package analytics
 */
router.post("/track", async (req, res) => {
  try {
    const { packageId, eventType, sessionId } = req.body || {};
    const normalizedEvent = String(eventType || "").toLowerCase();

    if (!packageId || !normalizedEvent) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    if (!EVENT_TYPES.includes(normalizedEvent)) {
      return res.status(400).json({ error: "Invalid event type" });
    }

    const pkg = await prisma.influencerPackage.findUnique({ where: { id: packageId } });
    if (!pkg) {
      return res.status(404).json({ error: "Package not found" });
    }

    const userId = getOptionalUserId(req);
    const ipAddress = getClientIp(req);

    const countersUpdate = {
      views: normalizedEvent === "profile_view" ? 1 : 0,
      clicks: normalizedEvent === "package_click" ? 1 : 0,
      saves: normalizedEvent === "package_save" ? 1 : 0,
      orders: normalizedEvent === "order_created" ? 1 : 0,
    };

    const analyticsTarget =
      normalizedEvent === "profile_view"
        ? { entity: "PROFILE", entityId: pkg.userId }
        : { entity: "PACKAGE", entityId: pkg.id };

    await prisma.$transaction([
      prisma.influencerPackageAnalytics.upsert({
        where: { packageId },
        create: {
          packageId,
          views: countersUpdate.views,
          clicks: countersUpdate.clicks,
          saves: countersUpdate.saves,
          orders: countersUpdate.orders,
        },
        update: {
          views: { increment: countersUpdate.views },
          clicks: { increment: countersUpdate.clicks },
          saves: { increment: countersUpdate.saves },
          orders: { increment: countersUpdate.orders },
        },
      }),
      prisma.influencerPackageEvent.create({
        data: {
          packageId,
          eventType: normalizedEvent,
          userId,
          ipAddress,
          sessionId: sessionId ? String(sessionId) : null,
        },
      }),
      prisma.analyticsEvent.create({
        data: {
          entity: analyticsTarget.entity,
          entityId: analyticsTarget.entityId,
          event: EVENT_TO_ANALYTICS[normalizedEvent].event,
        },
      }),
    ]);

    res.json({ ok: true });
  } catch (err) {
    console.error("Track analytics error:", err);
    res.status(500).json({ error: "Failed to track analytics" });
  }
});

/**
 * GET /api/analytics/package/:packageId
 * Get analytics counters for a package
 */
router.get("/package/:packageId", requireAuth, async (req, res) => {
  try {
    const { packageId } = req.params;

    const pkg = await prisma.influencerPackage.findUnique({ where: { id: packageId } });
    if (!pkg || pkg.userId !== req.user.id) {
      return res.status(404).json({ error: "Package not found" });
    }

    const analytics = await prisma.influencerPackageAnalytics.findUnique({
      where: { packageId },
    });

    res.json({
      packageId,
      views: analytics?.views || 0,
      clicks: analytics?.clicks || 0,
      saves: analytics?.saves || 0,
      orders: analytics?.orders || 0,
    });
  } catch (err) {
    console.error("Fetch analytics error:", err);
    res.status(500).json({ error: "Failed to fetch analytics" });
  }
});

/**
 * GET /api/analytics/packages/:username
 * Public analytics for creator packages
 */
router.get("/packages/:username", async (req, res) => {
  try {
    const username = String(req.params.username || "").trim();
    if (!username) return res.status(400).json({ error: "Invalid username" });

    const user = await prisma.user.findFirst({
      where: { username: { equals: username, mode: "insensitive" } },
      select: { id: true, username: true },
    });
    if (!user) return res.status(404).json({ error: "Profile not found" });

    const packages = await prisma.influencerPackage.findMany({
      where: { userId: user.id },
      include: { analytics: true },
      orderBy: { price: "asc" },
    });

    const items = packages.map((pkg) => ({
      packageId: pkg.id,
      views: pkg.analytics?.views || 0,
      clicks: pkg.analytics?.clicks || 0,
      saves: pkg.analytics?.saves || 0,
      orders: pkg.analytics?.orders || 0,
    }));

    res.json({ ok: true, username: user.username, items });
  } catch (err) {
    console.error("Fetch analytics by username error:", err);
    res.status(500).json({ error: "Failed to fetch analytics" });
  }
});

/**
 * GET /api/analytics/creator
 * Creator analytics summary (profile + packages)
 */
router.get("/creator", requireAuth, async (req, res) => {
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
