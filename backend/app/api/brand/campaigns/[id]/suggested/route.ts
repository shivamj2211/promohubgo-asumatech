import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/requireUser";
import { UserRole } from "@prisma/client";

function parseFollowers(v: any): number {
  if (!v) return 0;
  const s = String(v).replace(/,/g, "").trim();
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

function overlapScore(a: string[] = [], b: string[] = []) {
  const A = new Set(a.map((x) => String(x).toLowerCase()));
  const B = new Set(b.map((x) => String(x).toLowerCase()));
  let hit = 0;
  for (const x of A) if (B.has(x)) hit++;
  return hit;
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const brandId = await requireUserId();
    const id = String(params?.id || "");
    if (!id) return NextResponse.json({ ok: false, error: "Invalid id" }, { status: 400 });

    const campaign = await prisma.campaign.findFirst({
      where: { id, brandId },
      include: { requirements: true },
    });
    if (!campaign) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

    const reqs = campaign.requirements;
    const reqCategories = reqs?.categories || [];
    const reqLanguages = reqs?.languages || [];
    const reqLocations = reqs?.locations || [];
    const minF = reqs?.minFollowers ?? null;
    const maxF = reqs?.maxFollowers ?? null;

    // Fetch influencers with basics + categories + socials + profile
    const users = await prisma.user.findMany({
      where: { role: UserRole.INFLUENCER },
      include: {
        influencerProfile: true,
        influencerCategories: true,
        influencerSocials: true,
        userLocation: true,
      },
      take: 200, // safe cap
    });

    const scored = users
      .map((u) => {
        const categories = u.influencerCategories?.map((c) => c.key) || [];
        const languages = u.influencerProfile?.languages || [];
        const city = u.city ? [u.city] : [];
        const district = u.userLocation?.district ? [u.userLocation.district] : [];
        const state = u.userLocation?.statename ? [u.userLocation.statename] : [];
        const allLoc = [...city, ...district, ...state].filter(Boolean);

        // followers: take max across socials
        const followers = Math.max(...(u.influencerSocials || []).map((s) => parseFollowers(s.followers)), 0);

        // apply follower range filter if provided
        if (minF != null && followers < minF) return null;
        if (maxF != null && followers > maxF) return null;

        // compute score
        const catHits = overlapScore(reqCategories, categories);
        const langHits = overlapScore(reqLanguages, languages);
        const locHits = overlapScore(reqLocations, allLoc);

        // scoring weights (tunable)
        const score = catHits * 4 + langHits * 2 + locHits * 2 + Math.min(10, Math.floor(followers / 10000));

        return {
          id: u.id,
          name: u.name,
          username: u.username,
          image: u.image,
          city: u.city,
          followers,
          categories,
          languages,
          score,
        };
      })
      .filter(Boolean)
      .sort((a: any, b: any) => b.score - a.score)
      .slice(0, 30);

    return NextResponse.json({ ok: true, suggested: scored });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}
