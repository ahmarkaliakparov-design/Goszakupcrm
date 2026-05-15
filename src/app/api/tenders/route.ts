import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import type { Prisma } from "@prisma/client";

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
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50"), 200);
  const offset = parseInt(searchParams.get("offset") ?? "0");
  const minAmount = searchParams.get("minAmount") ? parseFloat(searchParams.get("minAmount")!) : null;
  const maxAmount = searchParams.get("maxAmount") ? parseFloat(searchParams.get("maxAmount")!) : null;
  const method = searchParams.get("method");
  const source = searchParams.get("source");
  const deadlineFrom = searchParams.get("deadlineFrom");
  const deadlineTo = searchParams.get("deadlineTo");
  const inPipeline = searchParams.get("inPipeline"); // "yes" | "no" | null
  const sortBy = searchParams.get("sortBy") ?? "createdAt"; // createdAt | deadline | totalAmount
  const sortDir = searchParams.get("sortDir") === "asc" ? "asc" : "desc";

  const where: Prisma.TenderWhereInput = {
    companyId,
    ...(search ? {
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { customerName: { contains: search, mode: "insensitive" } },
        { customerBin: { contains: search } },
      ],
    } : {}),
    ...(minAmount !== null || maxAmount !== null ? {
      totalAmount: {
        ...(minAmount !== null ? { gte: minAmount } : {}),
        ...(maxAmount !== null ? { lte: maxAmount } : {}),
      },
    } : {}),
    ...(method ? { method: { contains: method, mode: "insensitive" } } : {}),
    ...(source ? { source: source as Prisma.EnumTenderSourceFilter["equals"] } : {}),
    ...(deadlineFrom || deadlineTo ? {
      deadline: {
        ...(deadlineFrom ? { gte: new Date(deadlineFrom) } : {}),
        ...(deadlineTo ? { lte: new Date(deadlineTo) } : {}),
      },
    } : {}),
    ...(inPipeline === "yes"
      ? { lots: { some: { pipeline: { isNot: null } } } }
      : inPipeline === "no"
        ? { lots: { every: { pipeline: { is: null } } } }
        : {}),
  };

  const orderBy: Prisma.TenderOrderByWithRelationInput =
    sortBy === "deadline" ? { deadline: sortDir }
    : sortBy === "totalAmount" ? { totalAmount: sortDir }
    : { createdAt: sortDir };

  const [tenders, total] = await Promise.all([
    prisma.tender.findMany({
      where,
      include: { lots: { include: { pipeline: true } } },
      orderBy,
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
    include: { lots: true },
  });

  return NextResponse.json(tender, { status: 201 });
}
