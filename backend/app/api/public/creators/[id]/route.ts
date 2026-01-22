import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function buildLocationLabel(location: { district?: string | null; statename?: string | null }) {
  if (!location) return null;
  const district = location.district || "";
  const statename = location.statename || "";
  if (district && statename) return `${district}, ${statename}`;
  return statename || district || null;
}

async function resolveUserId(id: string) {
  const influencerProfile = await prisma.influencerProfile.findUnique({
    where: { id },
    select: { userId: true },
  });
  if (influencerProfile?.userId) {
    return { userId: influencerProfile.userId, type: "influencer" as const };
  }

  const brandProfile = await prisma.brandProfile.findUnique({
    where: { id },
    select: { userId: true },
  });
  if (brandProfile?.userId) {
    return { userId: brandProfile.userId, type: "brand" as const };
  }

  return { userId: id, type: null as "influencer" | "brand" | null };
}

async function buildPublicProfile(userId: string, preferredType?: "influencer" | "brand" | null) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      username: true,
      email: true,
      role: true,
      isPremium: true,
    },
  });

  if (!user) return null;

  const role = preferredType
    ? preferredType
    : String(user.role || "").toLowerCase() === "brand"
    ? "brand"
    : String(user.role || "").toLowerCase() === "influencer"
    ? "influencer"
    : null;

  const location = await prisma.userLocation.findUnique({ where: { userId } });
  const locationLabel = buildLocationLabel(location || {});

  if (role === "influencer") {
    const [profile, categories, socials, media] = await Promise.all([
      prisma.influencerProfile.findUnique({ where: { userId } }),
      prisma.influencerCategory.findMany({ where: { userId }, orderBy: { key: "asc" } }),
      prisma.influencerSocial.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
      prisma.influencerMedia.findMany({
        where: { userId },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      }),
    ]);

    const socialsMapped = socials.map((social) => ({
      platform: social.platform,
      username: social.username,
      url: social.url,
      followers: social.followers,
    }));

    const mediaMapped = {
      profile: media.filter((item) => item.type === "PROFILE").map((item) => item.url),
      cover: media.filter((item) => item.type === "COVER").map((item) => item.url),
    };

    return {
      type: "influencer",
      user: {
        id: user.id,
        name: user.name || user.username || user.email || "Creator",
        username: user.username,
        email: user.email,
        role: user.role,
        isPremium: user.isPremium,
      },
      profile: {
        title: profile?.title || null,
        description: profile?.description || null,
        languages: profile?.languages || [],
        categories: categories.map((cat) => cat.key),
        socials: socialsMapped,
        media: mediaMapped,
        locationLabel,
      },
      stats: {
        platforms: socialsMapped.length,
        followers: socialsMapped[0]?.followers || null,
      },
    };
  }

  if (role === "brand") {
    const [profile, categories, platforms, media] = await Promise.all([
      prisma.brandProfile.findUnique({ where: { userId } }),
      prisma.brandCategory.findMany({ where: { userId }, orderBy: { key: "asc" } }),
      prisma.brandPlatform.findMany({ where: { userId }, orderBy: { key: "asc" } }),
      prisma.brandMedia.findMany({
        where: { userId },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      }),
    ]);

    const mediaMapped = {
      profile: media.filter((item) => item.type === "PROFILE").map((item) => item.url),
      cover: media.filter((item) => item.type === "COVER").map((item) => item.url),
    };

    return {
      type: "brand",
      user: {
        id: user.id,
        name: user.name || user.username || user.email || "Brand",
        username: user.username,
        email: user.email,
        role: user.role,
        isPremium: user.isPremium,
      },
      profile: {
        here_to_do: profile?.hereToDo || null,
        approx_budget: profile?.approxBudget || null,
        business_type: profile?.businessType || null,
        categories: categories.map((cat) => cat.key),
        platforms: platforms.map((platform) => platform.key),
        media: mediaMapped,
        locationLabel,
      },
      stats: {
        platforms: platforms.length,
        businessType: profile?.businessType || null,
        budgetRange: profile?.approxBudget || null,
      },
    };
  }

  return null;
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const id = String(params.id || "");
    const resolved = await resolveUserId(id);
    const profile = await buildPublicProfile(resolved.userId, resolved.type);

    if (profile) {
      return NextResponse.json({ ok: true, ...profile });
    }

    return NextResponse.json({ ok: false, error: "No profile found" }, { status: 404 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}
