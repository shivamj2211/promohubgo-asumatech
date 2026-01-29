import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/requireUser";

function asStringArray(v: any): string[] {
  if (!v) return [];
  if (Array.isArray(v)) return v.map(String).filter(Boolean);
  return [];
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const userId = await requireUserId();
    const id = String(params?.id || "");
    if (!id) return NextResponse.json({ ok: false, error: "Invalid id" }, { status: 400 });

    const campaign = await prisma.campaign.findFirst({
      where: { id, brandId: userId },
      include: {
        requirements: true,
        influencers: true,
        stats: true,
      },
    });

    if (!campaign) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

    return NextResponse.json({ ok: true, campaign });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const userId = await requireUserId();
    const id = String(params?.id || "");
    if (!id) return NextResponse.json({ ok: false, error: "Invalid id" }, { status: 400 });

    const body = await req.json();

    const existing = await prisma.campaign.findFirst({ where: { id, brandId: userId } });
    if (!existing) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

    const data: any = {};
    if (body?.name !== undefined) data.name = String(body.name || "").trim();
    if (body?.objective !== undefined) data.objective = String(body.objective || "awareness");
    if (body?.description !== undefined) data.description = body.description ?? null;
    if (body?.platform !== undefined) data.platform = String(body.platform || "instagram");
    if (body?.contentTypes !== undefined) data.contentTypes = asStringArray(body.contentTypes);

    if (body?.budgetType !== undefined) data.budgetType = String(body.budgetType || "fixed");
    if (body?.minBudget !== undefined) data.minBudget = body.minBudget != null ? Number(body.minBudget) : null;
    if (body?.maxBudget !== undefined) data.maxBudget = body.maxBudget != null ? Number(body.maxBudget) : null;

    if (body?.startDate !== undefined) data.startDate = body.startDate ? new Date(body.startDate) : null;
    if (body?.endDate !== undefined) data.endDate = body.endDate ? new Date(body.endDate) : null;

    if (body?.status !== undefined) {
      const status = String(body.status);
      // draft | live | paused | completed
      if (!["draft", "live", "paused", "completed"].includes(status)) {
        return NextResponse.json({ ok: false, error: "Invalid status" }, { status: 400 });
      }
      data.status = status;
    }

    const reqData = body?.requirements;
    const updateRequirements =
      reqData &&
      (reqData.categories !== undefined ||
        reqData.locations !== undefined ||
        reqData.languages !== undefined ||
        reqData.minFollowers !== undefined ||
        reqData.maxFollowers !== undefined ||
        reqData.minEngagement !== undefined ||
        reqData.gender !== undefined);

    const campaign = await prisma.campaign.update({
      where: { id },
      data: {
        ...data,
        ...(updateRequirements
          ? {
              requirements: {
                upsert: {
                  create: {
                    categories: asStringArray(reqData?.categories),
                    locations: asStringArray(reqData?.locations),
                    languages: asStringArray(reqData?.languages),
                    minFollowers: reqData?.minFollowers != null ? Number(reqData.minFollowers) : null,
                    maxFollowers: reqData?.maxFollowers != null ? Number(reqData.maxFollowers) : null,
                    minEngagement: reqData?.minEngagement != null ? Number(reqData.minEngagement) : null,
                    gender: reqData?.gender != null ? String(reqData.gender) : null,
                  },
                  update: {
                    ...(reqData?.categories !== undefined && { categories: asStringArray(reqData.categories) }),
                    ...(reqData?.locations !== undefined && { locations: asStringArray(reqData.locations) }),
                    ...(reqData?.languages !== undefined && { languages: asStringArray(reqData.languages) }),
                    ...(reqData?.minFollowers !== undefined && { minFollowers: reqData.minFollowers != null ? Number(reqData.minFollowers) : null }),
                    ...(reqData?.maxFollowers !== undefined && { maxFollowers: reqData.maxFollowers != null ? Number(reqData.maxFollowers) : null }),
                    ...(reqData?.minEngagement !== undefined && { minEngagement: reqData.minEngagement != null ? Number(reqData.minEngagement) : null }),
                    ...(reqData?.gender !== undefined && { gender: reqData.gender != null ? String(reqData.gender) : null }),
                  },
                },
              },
            }
          : {}),
      },
      include: { requirements: true, stats: true },
    });

    return NextResponse.json({ ok: true, campaign });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}
