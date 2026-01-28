import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/requireUser";
import { recalculateBoosterForUser } from "@/lib/boosters/recalculate";

export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const prismaAny = prisma as any;

    const body = await req.json();
    const { boosterKey, meta } = body as { boosterKey: string; meta?: any };

    if (!boosterKey) {
      return NextResponse.json({ ok: false, error: "boosterKey is required" }, { status: 400 });
    }

    const booster = await prismaAny.booster.findUnique({ where: { key: boosterKey } });
    if (!booster) return NextResponse.json({ ok: false, error: "Invalid boosterKey" }, { status: 400 });

    const existing = await prismaAny.userBooster.findUnique({
      where: { userId_boosterId: { userId, boosterId: booster.id } },
    });

    let updated = existing;
    if (!existing || existing.status !== "completed") {
      updated = await prismaAny.userBooster.upsert({
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
    }

    const recalculated = await recalculateBoosterForUser(userId);
    const summary = {
      totalPoints: recalculated.totalPoints,
      earnedPoints: recalculated.earnedPoints,
      percent: recalculated.boosterPercent,
      boostLevel: recalculated.boosterLevel,
      boosterScore: recalculated.boosterScore,
    };

    return NextResponse.json({ ok: true, updated, summary });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}
