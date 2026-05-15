import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(2),
  bin: z.string().optional(),
  notes: z.string().optional(),
});

export async function GET(_req: NextRequest) {
  const authResult = await requireApiAuth();
  if (!authResult.ok) return authResult.response;
  const { companyId } = authResult;

  const competitors = await prisma.competitor.findMany({
    where: { companyId },
    include: {
      _count: { select: { lossRecords: true } },
      lossRecords: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: {
          pipeline: {
            include: { lot: { include: { tender: { select: { name: true, customerName: true } } } } },
          },
        },
      },
    },
    orderBy: { encounters: "desc" },
  });

  return NextResponse.json(competitors);
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

  const competitor = await prisma.competitor.upsert({
    where: { companyId_name: { companyId, name: parsed.data.name } },
    create: { ...parsed.data, companyId },
    update: { bin: parsed.data.bin, notes: parsed.data.notes },
  });

  return NextResponse.json(competitor, { status: 201 });
}
