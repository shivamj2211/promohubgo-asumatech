const express = require("express");
const jwt = require("jsonwebtoken");
const { prisma } = require("../lib/prisma");
const { requireAuth } = require("../middleware/auth");
const { COOKIE_NAME } = require("../utils/jwt");

const router = express.Router();

const EVENT_TYPES = ["profile_view", "package_click", "package_save", "order_created"];

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

module.exports = router;
