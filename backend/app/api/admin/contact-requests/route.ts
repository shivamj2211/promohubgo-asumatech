import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    // NOTE: If you already have admin auth middleware, enforce here.
    // Example: if (!isAdmin) return 403

    const rows = await prisma.auditLog.findMany({
      where: { action: "CONTACT_REQUEST" },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    return NextResponse.json({ ok: true, items: rows });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}
