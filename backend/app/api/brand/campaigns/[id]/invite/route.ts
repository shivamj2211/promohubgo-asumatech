import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/requireUser";

function normalizePair(a: string, b: string) {
  return a < b ? { userAId: a, userBId: b } : { userAId: b, userBId: a };
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const brandId = await requireUserId();
    const campaignId = String(params?.id || "");
    if (!campaignId) return NextResponse.json({ ok: false, error: "Invalid id" }, { status: 400 });

    const body = await req.json();
    const influencerId = String(body?.influencerId || "");
    const packageId = body?.packageId ? String(body.packageId) : null;

    if (!influencerId) {
      return NextResponse.json({ ok: false, error: "influencerId is required" }, { status: 400 });
    }

    const campaign = await prisma.campaign.findFirst({ where: { id: campaignId, brandId } });
    if (!campaign) return NextResponse.json({ ok: false, error: "Campaign not found" }, { status: 404 });

    // idempotent: avoid duplicate invite rows
    const existing = await prisma.campaignInfluencer.findFirst({
      where: { campaignId, influencerId },
    });

    const link = existing
      ? existing
      : await prisma.campaignInfluencer.create({
          data: {
            campaignId,
            influencerId,
            packageId,
            status: "invited",
          },
        });

    // Create/find a thread for brand & influencer (no requestId)
    const pair = normalizePair(brandId, influencerId);

    let thread = await prisma.thread.findFirst({
      where: {
        OR: [
          { userAId: pair.userAId, userBId: pair.userBId },
          { userAId: pair.userBId, userBId: pair.userAId },
        ],
      },
    });

    if (!thread) {
      thread = await prisma.thread.create({
        data: {
          userAId: pair.userAId,
          userBId: pair.userBId,
        },
      });
    }

    const note =
      typeof body?.message === "string" && body.message.trim()
        ? body.message.trim()
        : `Hi! We’d like to invite you to our campaign: "${campaign.name}". Please check details and share your availability.`;

    await prisma.threadMessage.create({
      data: {
        threadId: thread.id,
        senderId: brandId,
        body: note,
      },
    });

    await prisma.thread.update({
      where: { id: thread.id },
      data: { lastMessageAt: new Date(), updatedAt: new Date() },
    });

    return NextResponse.json({ ok: true, invited: link, threadId: thread.id });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}
