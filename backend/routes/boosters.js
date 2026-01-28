const express = require("express");
const { prisma } = require("../lib/prisma");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

const CATEGORY_MULTIPLIER = {
  Verification: 1.4,
  "Profile Power": 1.2,
  Performance: 1.1,
  Trust: 1.1,
  Audience: 1.0,
};

function getMultiplier(category) {
  if (!category) return 1.0;
  return CATEGORY_MULTIPLIER[category] || 1.0;
}

function getLevel(percent) {
  if (percent >= 90) return "Elite Boost";
  if (percent >= 70) return "High Boost";
  if (percent >= 40) return "Medium Boost";
  return "Starter Boost";
}

function isMissingTableError(error) {
  return error && error.code === "P2021";
}

async function recalculateBoosterForUser(userId) {
  const userBoosters = await prisma.userBooster.findMany({
    where: { userId },
    include: { booster: true },
  });

  const activeBoosters = userBoosters.filter((ub) => ub.booster && ub.booster.isActive);

  const totalPoints = activeBoosters.reduce((sum, ub) => sum + (ub.booster?.points || 0), 0);
  const earnedPoints = activeBoosters
    .filter((ub) => ub.status === "completed")
    .reduce((sum, ub) => sum + (ub.booster?.points || 0), 0);

  const weightedTotal = activeBoosters.reduce(
    (sum, ub) => sum + (ub.booster?.points || 0) * getMultiplier(ub.booster?.category),
    0
  );
  const weightedEarned = activeBoosters
    .filter((ub) => ub.status === "completed")
    .reduce((sum, ub) => sum + (ub.booster?.points || 0) * getMultiplier(ub.booster?.category), 0);

  let boosterPercent = weightedTotal === 0 ? 0 : Math.round((weightedEarned / weightedTotal) * 100);

  const portfolioCompleted = activeBoosters.some(
    (ub) => ub.booster?.key === "portfolio" && ub.status === "completed"
  );
  if (!portfolioCompleted) {
    boosterPercent = Math.min(boosterPercent, 85);
  }

  const boosterLevel = getLevel(boosterPercent);

  await prisma.user.update({
    where: { id: userId },
    data: {
      boosterScore: earnedPoints,
      boosterPercent,
      boosterLevel,
      boosterUpdatedAt: new Date(),
    },
  });

  return {
    totalPoints,
    earnedPoints,
    boosterPercent,
    boosterLevel,
    boosterScore: earnedPoints,
  };
}

router.get("/summary", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    const boosters = await prisma.booster.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    });

    if (boosters.length) {
      await prisma.$transaction(
        boosters.map((b) =>
          prisma.userBooster.upsert({
            where: { userId_boosterId: { userId, boosterId: b.id } },
            create: { userId, boosterId: b.id, status: "available" },
            update: {},
          })
        )
      );
    }

    const userBoosters = await prisma.userBooster.findMany({
      where: { userId },
      include: { booster: true },
      orderBy: { booster: { sortOrder: "asc" } },
    });

    const summary = await recalculateBoosterForUser(userId);

    return res.json({
      totalPoints: summary.totalPoints,
      earnedPoints: summary.earnedPoints,
      percent: summary.boosterPercent,
      boostLevel: summary.boosterLevel,
      boosters: userBoosters.map((ub) => ({
        key: ub.booster?.key,
        title: ub.booster?.title,
        description: ub.booster?.description,
        category: ub.booster?.category,
        points: ub.booster?.points,
        status: ub.status,
        completedAt: ub.completedAt,
        meta: ub.meta,
      })),
    });
  } catch (e) {
    if (isMissingTableError(e)) {
      return res.status(503).json({
        ok: false,
        error: "Boosters tables not found. Run the Prisma migration and seed.",
      });
    }
    console.error("GET /api/boosters/summary ERROR:", e);
    return res.status(500).json({
      ok: false,
      error: e?.message || "Server error",
      code: e?.code || null,
    });
  }
});

router.post("/complete", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { boosterKey, meta } = req.body || {};

    if (!boosterKey) {
      return res.status(400).json({ ok: false, error: "boosterKey is required" });
    }

    const booster = await prisma.booster.findUnique({ where: { key: boosterKey } });
    if (!booster) {
      return res.status(400).json({ ok: false, error: "Invalid boosterKey" });
    }

    const existing = await prisma.userBooster.findUnique({
      where: { userId_boosterId: { userId, boosterId: booster.id } },
    });

    let updated = existing;
    if (!existing || existing.status !== "completed") {
      updated = await prisma.userBooster.upsert({
        where: { userId_boosterId: { userId, boosterId: booster.id } },
        create: {
          userId,
          boosterId: booster.id,
          status: "completed",
          completedAt: new Date(),
          meta: meta ?? undefined,
        },
        update: {
          status: "completed",
          completedAt: new Date(),
          meta: meta ?? undefined,
        },
      });
    } else if (meta !== undefined) {
      updated = await prisma.userBooster.update({
        where: { userId_boosterId: { userId, boosterId: booster.id } },
        data: { meta: meta ?? undefined },
      });
    }

    const recalculated = await recalculateBoosterForUser(userId);
    const summary = {
      totalPoints: recalculated.totalPoints,
      earnedPoints: recalculated.earnedPoints,
      percent: recalculated.boosterPercent,
      boostLevel: recalculated.boosterLevel,
      boosterScore: recalculated.boosterScore,
    };

    return res.json({ ok: true, updated, summary });
  } catch (e) {
    if (isMissingTableError(e)) {
      return res.status(503).json({
        ok: false,
        error: "Boosters tables not found. Run the Prisma migration and seed.",
      });
    }
    console.error("POST /api/boosters/complete ERROR:", e);
    return res.status(500).json({
      ok: false,
      error: e?.message || "Server error",
      code: e?.code || null,
    });
  }
});

module.exports = router;
