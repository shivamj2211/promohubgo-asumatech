import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/requireUser";

export async function GET(req: Request) {
  try {
    // NOTE: If you already have admin auth middleware, enforce here.
    // Example: if (!isAdmin) return 403

    await requireUserId();
    const url = new URL(req.url);
    const status = String(url.searchParams.get("status") || "pending").toLowerCase();
    if (!["pending", "accepted", "rejected"].includes(status)) {
      return NextResponse.json({ ok: false, error: "Invalid status" }, { status: 400 });
    }

    const rows = await prisma.contactRequest.findMany({
      where: { status },
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        fromUser: { select: { id: true, name: true, username: true, email: true, role: true } },
        toUser: { select: { id: true, name: true, username: true, email: true, role: true } },
      },
    });

    const items = rows.map((row) => ({
      id: row.id,
      status: row.status,
      message: row.message,
      listingId: row.listingId,
      createdAt: row.createdAt,
      fromUser: row.fromUser,
      toUser: row.toUser,
    }));

    return NextResponse.json({ ok: true, items });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}
