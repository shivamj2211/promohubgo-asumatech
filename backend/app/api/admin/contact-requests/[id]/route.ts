import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/requireUser";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const adminId = await requireUserId();
    const id = String(params.id || "");
    if (!id) {
      return NextResponse.json({ ok: false, error: "Invalid id" }, { status: 400 });
    }

    const body = await req.json();
    const status = String(body?.status || "").toLowerCase();
    if (!["accepted", "rejected"].includes(status)) {
      return NextResponse.json({ ok: false, error: "Invalid status" }, { status: 400 });
    }

    const request = await prisma.contactRequest.findUnique({ where: { id } });
    if (!request) {
      return NextResponse.json({ ok: false, error: "Request not found" }, { status: 404 });
    }
    if (request.status !== "pending") {
      return NextResponse.json({ ok: false, error: "Request already handled" }, { status: 400 });
    }

    let threadId: string | null = null;
    if (status === "accepted") {
      const thread = await prisma.thread.create({
        data: {
          requestId: request.id,
          userAId: request.fromUserId,
          userBId: request.toUserId,
        },
      });
      threadId = thread.id;
    }

    await prisma.contactRequest.update({
      where: { id },
      data: {
        status,
        handledById: adminId,
        handledAt: new Date(),
      },
    });

    return NextResponse.json({ ok: true, threadId });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}
