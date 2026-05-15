import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  ids: z.array(z.string()).min(1),
  action: z.enum(["stage", "priority", "archive", "unarchive", "delete"]),
  stage: z.enum(["FOUND", "ANALYSIS", "CALCULATION", "SUBMITTED", "WON", "LOST", "CONTRACT", "DELIVERY", "PAYMENT", "CLOSED"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
});

export async function POST(req: NextRequest) {
  const authResult = await requireApiAuth();
  if (!authResult.ok) return authResult.response;
  const { companyId } = authResult;

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation error", details: parsed.error.issues }, { status: 400 });
  }

  const { ids, action, stage, priority } = parsed.data;

  const pipelines = await prisma.lotPipeline.findMany({
    where: { id: { in: ids }, companyId },
    select: { id: true, stage: true },
  });

  if (pipelines.length === 0) return NextResponse.json({ updated: 0 });

  if (action === "stage" && stage) {
    const now = new Date();
    const stamp =
      stage === "SUBMITTED" ? { submittedAt: now } :
      stage === "WON" ? { wonAt: now } :
      stage === "LOST" ? { lostAt: now } :
      stage === "CONTRACT" ? { contractAt: now } :
      stage === "DELIVERY" ? { deliveredAt: now } :
      stage === "PAYMENT" ? { paidAt: now } :
      stage === "CLOSED" ? { closedAt: now } : {};

    await prisma.$transaction([
      prisma.lotPipeline.updateMany({
        where: { id: { in: ids }, companyId },
        data: { stage, ...stamp },
      }),
      ...pipelines
        .filter((p) => p.stage !== stage)
        .map((p) =>
          prisma.pipelineHistory.create({
            data: { pipelineId: p.id, fromStage: p.stage, toStage: stage },
          })
        ),
    ]);
    return NextResponse.json({ updated: pipelines.length });
  }

  if (action === "priority" && priority) {
    const r = await prisma.lotPipeline.updateMany({
      where: { id: { in: ids }, companyId },
      data: { priority },
    });
    return NextResponse.json({ updated: r.count });
  }

  if (action === "archive" || action === "unarchive") {
    const r = await prisma.lotPipeline.updateMany({
      where: { id: { in: ids }, companyId },
      data: { isArchived: action === "archive" },
    });
    return NextResponse.json({ updated: r.count });
  }

  if (action === "delete") {
    const r = await prisma.lotPipeline.deleteMany({
      where: { id: { in: ids }, companyId },
    });
    return NextResponse.json({ updated: r.count });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
