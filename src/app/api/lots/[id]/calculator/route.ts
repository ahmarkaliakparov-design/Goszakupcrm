import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  purchasePrice: z.number(),
  deliveryCost: z.number(),
  vatRate: z.number(),
  vatAmount: z.number(),
  contractDeposit: z.number(),
  financingCost: z.number(),
  totalCost: z.number(),
  desiredMargin: z.number(),
  recommendedPrice: z.number(),
  supplierId: z.string().optional(),
  notes: z.string().optional(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const authResult = await requireApiAuth();
  if (!authResult.ok) return authResult.response;
  const { companyId } = authResult;

  const lot = await prisma.lot.findFirst({ where: { id, tender: { companyId } } });
  if (!lot) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation error" }, { status: 400 });

  const calc = await prisma.costCalculation.create({
    data: { lotId: id, companyId, ...parsed.data },
  });

  return NextResponse.json(calc, { status: 201 });
}
