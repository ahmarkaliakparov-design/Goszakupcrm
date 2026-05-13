import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const priceSchema = z.object({
  action: z.literal("add_price"),
  itemName: z.string().min(2),
  ktru: z.string().optional(),
  unit: z.string().optional(),
  price: z.number().positive(),
});

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  bin: z.string().optional(),
  contactName: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  category: z.string().optional(),
  paymentTerms: z.string().optional(),
  minOrder: z.number().optional(),
  deliveryDays: z.number().int().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().optional(),
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const authResult = await requireApiAuth();
  if (!authResult.ok) return authResult.response;
  const { companyId } = authResult;

  const supplier = await prisma.supplier.findFirst({
    where: { id, companyId },
    include: { prices: { orderBy: { itemName: "asc" } } },
  });

  if (!supplier) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(supplier);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const authResult = await requireApiAuth();
  if (!authResult.ok) return authResult.response;
  const { companyId } = authResult;

  const body = await req.json();

  if (body.action === "add_price") {
    const parsed = priceSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Validation error" }, { status: 400 });

    const { action, ...priceData } = parsed.data;
    const price = await prisma.supplierPrice.create({
      data: { supplierId: id, ...priceData },
    });
    return NextResponse.json(price);
  }

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation error" }, { status: 400 });

  const { minOrder, ...rest } = parsed.data;
  await prisma.supplier.updateMany({
    where: { id, companyId },
    data: { ...rest, ...(minOrder !== undefined ? { minOrder } : {}) },
  });

  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const authResult = await requireApiAuth();
  if (!authResult.ok) return authResult.response;
  const { companyId } = authResult;

  await prisma.supplier.deleteMany({ where: { id, companyId } });
  return NextResponse.json({ success: true });
}
