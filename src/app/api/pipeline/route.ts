import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import type { PipeStage } from "@prisma/client";

export async function GET(req: NextRequest) {
  const authResult = await requireApiAuth();
  if (!authResult.ok) return authResult.response;
  const { companyId } = authResult;

  const pipelines = await prisma.lotPipeline.findMany({
    where: { companyId, isArchived: false },
    include: {
      lot: {
        include: { tender: true },
      },
      comments: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { updatedAt: "desc" },
  });

  const stages: Record<PipeStage, typeof pipelines> = {
    FOUND: [], ANALYSIS: [], CALCULATION: [], SUBMITTED: [],
    WON: [], LOST: [], CONTRACT: [], DELIVERY: [], PAYMENT: [], CLOSED: [],
  };

  for (const p of pipelines) {
    stages[p.stage].push(p);
  }

  return NextResponse.json(stages);
}

const addSchema = z.object({
  lotId: z.string(),
  stage: z.enum(["FOUND", "ANALYSIS", "CALCULATION", "SUBMITTED", "WON", "LOST", "CONTRACT", "DELIVERY", "PAYMENT", "CLOSED"]).default("FOUND"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM"),
});

export async function POST(req: NextRequest) {
  const authResult = await requireApiAuth();
  if (!authResult.ok) return authResult.response;
  const { companyId } = authResult;

  const body = await req.json();
  const parsed = addSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation error" }, { status: 400 });

  const lot = await prisma.lot.findFirst({
    where: { id: parsed.data.lotId, tender: { companyId } },
  });
  if (!lot) return NextResponse.json({ error: "Lot not found" }, { status: 404 });

  const pipeline = await prisma.lotPipeline.upsert({
    where: { lotId: parsed.data.lotId },
    create: {
      lotId: parsed.data.lotId,
      companyId,
      stage: parsed.data.stage,
      priority: parsed.data.priority,
      history: {
        create: { toStage: parsed.data.stage },
      },
    },
    update: {},
  });

  return NextResponse.json(pipeline, { status: 201 });
}
