import { prisma } from "@/lib/prisma";

type RecalculateSummary = {
  earnedPoints: number;
  totalPoints: number;
  boosterPercent: number;
  boosterLevel: string;
  boosterScore: number;
};

const CATEGORY_MULTIPLIER: Record<string, number> = {
  Verification: 1.4,
  "Profile Power": 1.2,
  Performance: 1.1,
  Trust: 1.1,
  Audience: 1.0,
};

function getMultiplier(category: string | null | undefined) {
  if (!category) return 1.0;
  return CATEGORY_MULTIPLIER[category] ?? 1.0;
}

function getLevel(percent: number) {
  if (percent >= 90) return "Elite Boost";
  if (percent >= 70) return "High Boost";
  if (percent >= 40) return "Medium Boost";
  return "Starter Boost";
}

export async function recalculateBoosterForUser(userId: string): Promise<RecalculateSummary> {
  const userBoosters = await prisma.userBooster.findMany({
    where: { userId },
    include: { booster: true },
  });

  const activeBoosters = userBoosters.filter((ub) => ub.booster.isActive);

  const totalPoints = activeBoosters.reduce((sum, ub) => sum + ub.booster.points, 0);
  const earnedPoints = activeBoosters
    .filter((ub) => ub.status === "completed")
    .reduce((sum, ub) => sum + ub.booster.points, 0);

  const weightedTotal = activeBoosters.reduce(
    (sum, ub) => sum + ub.booster.points * getMultiplier(ub.booster.category),
    0
  );
  const weightedEarned = activeBoosters
    .filter((ub) => ub.status === "completed")
    .reduce((sum, ub) => sum + ub.booster.points * getMultiplier(ub.booster.category), 0);

  let boosterPercent = weightedTotal === 0 ? 0 : Math.round((weightedEarned / weightedTotal) * 100);

  const portfolioCompleted = activeBoosters.some(
    (ub) => ub.booster.key === "portfolio" && ub.status === "completed"
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
    earnedPoints,
    totalPoints,
    boosterPercent,
    boosterLevel,
    boosterScore: earnedPoints,
  };
}
