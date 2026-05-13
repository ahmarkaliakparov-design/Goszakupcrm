import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateSchema = z.object({
  stage: z.enum(["FOUND", "ANALYSIS", "CALCULATION", "SUBMITTED", "WON", "LOST", "CONTRACT", "DELIVERY", "PAYMENT", "CLOSED"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
  notes: z.string().optional(),
  submittedPrice: z.number().optional(),
  lostReason: z.string().optional(),
  isArchived: z.boolean().optional(),
});

const commentSchema = z.object({
  text: z.string().min(1),
  action: z.literal("comment"),
});

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const authResult = await requireApiAuth();
  if (!authResult.ok) return authResult.response;
  const { companyId } = authResult;

  const body = await req.json();

  if (body.action === "comment") {
    const parsed = commentSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Validation error" }, { status: 400 });

    const pipeline = await prisma.lotPipeline.findFirst({ where: { id, companyId } });
    if (!pipeline) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const comment = await prisma.comment.create({
      data: { pipelineId: id, text: parsed.data.text },
    });
    return NextResponse.json(comment);
  }

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation error" }, { status: 400 });

  const current = await prisma.lotPipeline.findFirst({ where: { id, companyId } });
  if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { stage, submittedPrice, ...rest } = parsed.data;

  const updateData: Record<string, unknown> = { ...rest };
  if (submittedPrice !== undefined) updateData.submittedPrice = submittedPrice;

  if (stage && stage !== current.stage) {
    updateData.stage = stage;
    const now = new Date();
    if (stage === "SUBMITTED") updateData.submittedAt = now;
    if (stage === "WON") updateData.wonAt = now;
    if (stage === "LOST") updateData.lostAt = now;
    if (stage === "CONTRACT") updateData.contractAt = now;
    if (stage === "DELIVERY") updateData.deliveredAt = now;
    if (stage === "PAYMENT") updateData.paidAt = now;
    if (stage === "CLOSED") updateData.closedAt = now;

    await prisma.pipelineHistory.create({
      data: { pipelineId: id, fromStage: current.stage, toStage: stage },
    });
  }

  const updated = await prisma.lotPipeline.update({
    where: { id },
    data: updateData,
    include: {
      comments: { orderBy: { createdAt: "asc" } },
      history: { orderBy: { changedAt: "asc" } },
    },
  });

  return NextResponse.json(updated);
}
