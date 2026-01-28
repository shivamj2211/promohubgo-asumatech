import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/requireUser";
import { recalculateBoosterForUser } from "@/lib/boosters/recalculate";

export async function GET() {
  try {
    const userId = await requireUserId();
    const prismaAny = prisma as any;

    const boosters = await prismaAny.booster.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    });

    // Ensure user has UserBooster rows for all boosters (idempotent)
    if (boosters.length > 0) {
      await prismaAny.$transaction(
        boosters.map((b: any) =>
          prismaAny.userBooster.upsert({
            where: { userId_boosterId: { userId, boosterId: b.id } },
            create: { userId, boosterId: b.id, status: "available" },
            update: {},
          })
        )
      );
    }

    const userBoosters = await prismaAny.userBooster.findMany({
      where: { userId },
      include: { booster: true },
      orderBy: { booster: { sortOrder: "asc" } },
    });

    const summary = await recalculateBoosterForUser(userId);

    return NextResponse.json({
      totalPoints: summary.totalPoints,
      earnedPoints: summary.earnedPoints,
      percent: summary.boosterPercent,
      boostLevel: summary.boosterLevel,
      boosters: userBoosters.map((ub: any) => ({
        key: ub.booster.key,
        title: ub.booster.title,
        description: ub.booster.description,
        category: ub.booster.category,
        points: ub.booster.points,
        status: ub.status,
        completedAt: ub.completedAt,
        meta: ub.meta,
      })),
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}
