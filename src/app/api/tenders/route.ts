import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(3),
  customerName: z.string().optional(),
  customerBin: z.string().optional(),
  method: z.string().optional(),
  totalAmount: z.number().positive().optional(),
  deadline: z.string().optional(),
  source: z.enum(["GOSZAKUP", "SAMRUK", "MITWORK", "OTHER"]).default("OTHER"),
  lots: z.array(z.object({
    name: z.string().min(2),
    ktru: z.string().optional(),
    unit: z.string().optional(),
    quantity: z.number().positive().optional(),
    unitPrice: z.number().positive().optional(),
    totalPrice: z.number().positive().optional(),
    description: z.string().optional(),
  })).optional(),
});

export async function GET(req: NextRequest) {
  const authResult = await requireApiAuth();
  if (!authResult.ok) return authResult.response;
  const { companyId } = authResult;

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? "";
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50"), 100);
  const offset = parseInt(searchParams.get("offset") ?? "0");

  const where = {
    companyId,
    ...(search ? {
      OR: [
        { name: { contains: search, mode: "insensitive" as const } },
        { customerName: { contains: search, mode: "insensitive" as const } },
      ],
    } : {}),
  };

  const [tenders, total] = await Promise.all([
    prisma.tender.findMany({
      where,
      include: {
        lots: {
          include: { pipeline: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.tender.count({ where }),
  ]);

  return NextResponse.json({ tenders, total });
}

export async function POST(req: NextRequest) {
  const authResult = await requireApiAuth();
  if (!authResult.ok) return authResult.response;
  const { companyId } = authResult;

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation error", details: parsed.error.issues }, { status: 400 });
  }

  const { lots, deadline, totalAmount, ...tenderData } = parsed.data;

  const tender = await prisma.tender.create({
    data: {
      ...tenderData,
      companyId,
      externalId: `manual-${Date.now()}`,
      totalAmount: totalAmount ?? undefined,
      deadline: deadline ? new Date(deadline) : undefined,
      lots: lots ? {
        create: lots.map((lot) => ({
          name: lot.name,
          ktru: lot.ktru,
          unit: lot.unit,
          quantity: lot.quantity,
          unitPrice: lot.unitPrice,
          totalPrice: lot.totalPrice ?? (lot.quantity && lot.unitPrice ? lot.quantity * lot.unitPrice : undefined),
          description: lot.description,
        })),
      } : undefined,
    },
    include: {
      lots: true,
    },
  });

  return NextResponse.json(tender, { status: 201 });
}
