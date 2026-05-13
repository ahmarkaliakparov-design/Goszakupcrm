import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  bin: z.string().optional(),
  region: z.string().optional(),
  category: z.string().optional(),
  paymentDays: z.number().int().min(0).optional(),
  rating: z.number().int().min(1).max(5).optional(),
  notes: z.string().optional(),
  isBlacklist: z.boolean().optional(),
});

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const authResult = await requireApiAuth();
  if (!authResult.ok) return authResult.response;
  const { companyId } = authResult;

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation error" }, { status: 400 });

  await prisma.customer.updateMany({ where: { id, companyId }, data: parsed.data });
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const authResult = await requireApiAuth();
  if (!authResult.ok) return authResult.response;
  const { companyId } = authResult;

  await prisma.customer.deleteMany({ where: { id, companyId } });
  return NextResponse.json({ success: true });
}
