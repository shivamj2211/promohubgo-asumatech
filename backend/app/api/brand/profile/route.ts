import { NextResponse } from "next/server"
import { prisma } from "../../../../lib/prisma"
import { requireUserId } from "../../../../lib/requireUser"
import { UserRole } from "@prisma/client"


export async function PATCH(req: Request) {
  try {
    const userId = await requireUserId()
    const body = await req.json()

    const { here_to_do, approx_budget, business_type } = body ?? {}

    // ensure role
    await prisma.user.update({
      where: { id: userId },
      data: { role: UserRole.BRAND },
    })

    const brandProfile = await prisma.brandProfile.upsert({
      where: { userId },
      create: {
        userId,
        hereToDo: typeof here_to_do === "string" ? here_to_do : null,
        approxBudget: typeof approx_budget === "string" ? approx_budget : null,
        businessType: typeof business_type === "string" ? business_type : null,
      },
      update: {
        ...(here_to_do !== undefined && { hereToDo: here_to_do ?? null }),
        ...(approx_budget !== undefined && { approxBudget: approx_budget ?? null }),
        ...(business_type !== undefined && { businessType: business_type ?? null }),
      },
    })

    return NextResponse.json({ ok: true, brandProfile })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 401 })
  }
}
