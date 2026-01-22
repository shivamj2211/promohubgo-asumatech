import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/requireUser";

// expects JSON: { toUserId, listingId?, message }
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { toUserId, listingId, message } = body || {};

    if (!toUserId || !message) {
      return NextResponse.json({ ok: false, error: "toUserId and message required" }, { status: 400 });
    }

    const fromUserId = await requireUserId();
    if (fromUserId === toUserId) {
      return NextResponse.json({ ok: false, error: "Cannot contact yourself" }, { status: 400 });
    }

    const target = await prisma.user.findUnique({ where: { id: String(toUserId) }, select: { id: true } });
    if (!target) {
      return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });
    }

    const request = await prisma.contactRequest.create({
      data: {
        fromUserId,
        toUserId: String(toUserId),
        listingId: listingId ? String(listingId) : null,
        message: String(message).slice(0, 2000),
      },
    });

    return NextResponse.json({ ok: true, requestId: request.id });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}
