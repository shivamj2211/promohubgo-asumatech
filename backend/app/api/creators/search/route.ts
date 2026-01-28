import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";

function parseNumber(value: string | null) {
  if (!value) return null;
  const parsed = Number(value);
  if (Number.isNaN(parsed)) return null;
  return parsed;
}

function getBadge(percent: number) {
  if (percent >= 90) return { badge: "Elite", rankReason: "Top boosted creator" };
  if (percent >= 70) return { badge: "Boosted", rankReason: "Strong boost signals" };
  if (percent >= 40) return { badge: "Growing", rankReason: "Building trust quickly" };
  return { badge: "Starter", rankReason: "New creator profile" };
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const search = url.searchParams;

    const q = search.get("q")?.trim() || "";
    const city = search.get("city")?.trim() || "";
    const niche = search.get("niche")?.trim() || "";
    const minBudget = parseNumber(search.get("minBudget"));
    const maxBudget = parseNumber(search.get("maxBudget"));
    const boostedOnly = search.get("boostedOnly") === "true";
    const sort = (search.get("sort") || "best").toLowerCase();
    const page = Math.max(1, parseInt(search.get("page") || "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(search.get("limit") || "12", 10)));

    const priceFilter: { gte?: number; lte?: number } = {};
    if (minBudget !== null) priceFilter.gte = minBudget;
    if (maxBudget !== null) priceFilter.lte = maxBudget;

    const where: any = {
      role: UserRole.INFLUENCER,
      ...(boostedOnly ? { boosterPercent: { gte: 70 } } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { username: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(city ? { city: { contains: city, mode: "insensitive" } } : {}),
      ...(niche
        ? {
            influencerCategories: {
              some: { key: { contains: niche, mode: "insensitive" } },
            },
          }
        : {}),
      ...(Object.keys(priceFilter).length
        ? {
            influencerPackages: {
              some: {
                price: priceFilter,
              },
            },
          }
        : {}),
    };

    const orderBy =
      sort === "newest"
        ? [{ createdAt: "desc" }]
        : sort === "boosted"
        ? [{ boosterPercent: "desc" }, { boosterUpdatedAt: "desc" }]
        : [{ boosterPercent: "desc" }, { boosterUpdatedAt: "desc" }, { createdAt: "desc" }];

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          name: true,
          username: true,
          image: true,
          city: true,
          createdAt: true,
          boosterPercent: true,
          boosterLevel: true,
          boosterScore: true,
          boosterUpdatedAt: true,
          influencerCategories: {
            select: { key: true },
            orderBy: { key: "asc" },
          },
          influencerPackages: {
            select: { price: true },
            orderBy: { price: "asc" },
            take: 1,
          },
        },
      }),
    ]);

    const results = users.map((user) => {
      const percent = user.boosterPercent ?? 0;
      const { badge, rankReason } = getBadge(percent);
      const primaryNiche = user.influencerCategories[0]?.key || null;
      const startingPrice = user.influencerPackages[0]?.price ?? null;

      return {
        id: user.id,
        name: user.name || user.username || "Creator",
        username: user.username,
        imageUrl: user.image,
        boosterPercent: percent,
        boosterLevel: user.boosterLevel ?? "Starter Boost",
        boosterScore: user.boosterScore ?? 0,
        creatorProfile: {
          city: user.city || null,
          primaryNiche,
          startingPrice,
        },
        badge,
        rankReason,
      };
    });

    const totalPages = Math.max(1, Math.ceil(total / limit));
    const minBoosterPercent = boostedOnly ? 70 : 0;

    return NextResponse.json({
      meta: { total, page, limit, totalPages, sort, boostedOnly, minBoosterPercent },
      results,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}
