import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(3).optional(),
  customerName: z.string().optional(),
  customerBin: z.string().optional(),
  method: z.string().optional(),
  totalAmount: z.number().positive().optional(),
  deadline: z.string().optional(),
  status: z.string().optional(),
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const authResult = await requireApiAuth();
  if (!authResult.ok) return authResult.response;
  const { companyId } = authResult;

  const tender = await prisma.tender.findFirst({
    where: { id, companyId },
    include: {
      lots: {
        include: {
          pipeline: {
            include: { comments: { orderBy: { createdAt: "desc" } } },
          },
          costCalculations: { orderBy: { createdAt: "desc" }, take: 1 },
          aiAnalyses: { orderBy: { createdAt: "desc" }, take: 1 },
        },
      },
    },
  });

  if (!tender) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(tender);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const authResult = await requireApiAuth();
  if (!authResult.ok) return authResult.response;
  const { companyId } = authResult;

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation error" }, { status: 400 });

  const { deadline, totalAmount, ...rest } = parsed.data;

  const tender = await prisma.tender.updateMany({
    where: { id, companyId },
    data: {
      ...rest,
      ...(totalAmount !== undefined ? { totalAmount } : {}),
      ...(deadline ? { deadline: new Date(deadline) } : {}),
    },
  });

  if (tender.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const authResult = await requireApiAuth();
  if (!authResult.ok) return authResult.response;
  const { companyId } = authResult;

  await prisma.tender.deleteMany({ where: { id, companyId } });
  return NextResponse.json({ success: true });
}
