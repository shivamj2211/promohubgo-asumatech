import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/requireUser";
import { UserRole } from "@prisma/client";

function asStringArray(v: any): string[] {
  if (!v) return [];
  if (Array.isArray(v)) return v.map(String).filter(Boolean);
  return [];
}

export async function GET() {
  try {
    const userId = await requireUserId();

    // ensure role is BRAND (safe)
    await prisma.user.update({
      where: { id: userId },
      data: { role: UserRole.BRAND },
    });

    const campaigns = await prisma.campaign.findMany({
      where: { brandId: userId },
      orderBy: { createdAt: "desc" },
      include: {
        requirements: true,
        stats: true,
        influencers: true,
      },
    });

    const shaped = campaigns.map((c) => ({
      ...c,
      influencerCount: c.influencers?.length || 0,
    }));

    return NextResponse.json({ ok: true, campaigns: shaped });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const body = await req.json();

    const name = String(body?.name || "").trim();
    if (!name) {
      return NextResponse.json({ ok: false, error: "Campaign name is required" }, { status: 400 });
    }

    const objective = String(body?.objective || "awareness");
    const description = typeof body?.description === "string" ? body.description : null;
    const platform = String(body?.platform || "instagram"); // instagram | youtube | both
    const contentTypes = asStringArray(body?.contentTypes); // ["reel","story"]

    const budgetType = String(body?.budgetType || "fixed"); // fixed | total
    const minBudget = body?.minBudget != null ? Number(body.minBudget) : null;
    const maxBudget = body?.maxBudget != null ? Number(body.maxBudget) : null;

    const startDate = body?.startDate ? new Date(body.startDate) : null;
    const endDate = body?.endDate ? new Date(body.endDate) : null;

    const categories = asStringArray(body?.requirements?.categories);
    const locations = asStringArray(body?.requirements?.locations);
    const languages = asStringArray(body?.requirements?.languages);
    const minFollowers = body?.requirements?.minFollowers != null ? Number(body.requirements.minFollowers) : null;
    const maxFollowers = body?.requirements?.maxFollowers != null ? Number(body.requirements.maxFollowers) : null;
    const minEngagement = body?.requirements?.minEngagement != null ? Number(body.requirements.minEngagement) : null;
    const gender = body?.requirements?.gender != null ? String(body.requirements.gender) : null;

    // ensure role is BRAND (safe)
    await prisma.user.update({
      where: { id: userId },
      data: { role: UserRole.BRAND },
    });

    const campaign = await prisma.campaign.create({
      data: {
        brandId: userId,
        name,
        objective,
        description,
        platform,
        contentTypes,
        budgetType,
        minBudget,
        maxBudget,
        startDate,
        endDate,
        status: "draft",
        requirements: {
          create: {
            categories,
            locations,
            languages,
            minFollowers,
            maxFollowers,
            minEngagement,
            gender,
          },
        },
        stats: { create: {} }, // initialize stats row
      },
      include: {
        requirements: true,
        stats: true,
      },
    });

    return NextResponse.json({ ok: true, campaign });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}
