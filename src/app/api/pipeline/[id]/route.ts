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

const lossSchema = z.object({
  action: z.literal("loss"),
  winnerName: z.string().optional(),
  winnerBin: z.string().optional(),
  winningPrice: z.number().optional(),
  ourPrice: z.number().optional(),
  reason: z.enum(["PRICE_TOO_HIGH", "WRONG_SPECS", "LATE_SUBMISSION", "DOCUMENTS", "DISQUALIFIED", "CUSTOMER_PREFERENCE", "OTHER"]).default("OTHER"),
  notes: z.string().optional(),
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

  if (body.action === "loss") {
    const parsed = lossSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Validation error", details: parsed.error.issues }, { status: 400 });

    const pipeline = await prisma.lotPipeline.findFirst({ where: { id, companyId } });
    if (!pipeline) return NextResponse.json({ error: "Not found" }, { status: 404 });

    let competitorId: string | undefined;
    if (parsed.data.winnerName) {
      const competitor = await prisma.competitor.upsert({
        where: { companyId_name: { companyId, name: parsed.data.winnerName } },
        create: { companyId, name: parsed.data.winnerName, bin: parsed.data.winnerBin },
        update: { bin: parsed.data.winnerBin ?? undefined },
      });
      competitorId = competitor.id;
    }

    const ourPrice = parsed.data.ourPrice ?? (Number(pipeline.submittedPrice ?? 0) || undefined);

    await prisma.lossRecord.upsert({
      where: { pipelineId: id },
      create: {
        pipelineId: id,
        competitorId,
        winnerName: parsed.data.winnerName,
        winningPrice: parsed.data.winningPrice,
        ourPrice,
        reason: parsed.data.reason,
        notes: parsed.data.notes,
      },
      update: {
        competitorId,
        winnerName: parsed.data.winnerName,
        winningPrice: parsed.data.winningPrice,
        ourPrice,
        reason: parsed.data.reason,
        notes: parsed.data.notes,
      },
    });

    // Refresh competitor stats
    if (competitorId) {
      const records = await prisma.lossRecord.findMany({
        where: { competitorId },
      });
      const totalWin = records.reduce((s, r) => s + Number(r.winningPrice ?? 0), 0);
      const validDiscounts = records
        .map((r) => {
          const ours = Number(r.ourPrice ?? 0);
          const winning = Number(r.winningPrice ?? 0);
          if (!ours || !winning) return null;
          return ((ours - winning) / ours) * 100;
        })
        .filter((d): d is number => d !== null);
      const avgDiscount = validDiscounts.length
        ? validDiscounts.reduce((a, b) => a + b, 0) / validDiscounts.length
        : null;

      await prisma.competitor.update({
        where: { id: competitorId },
        data: {
          encounters: records.length,
          wins: records.length,
          totalWinAmount: totalWin,
          avgDiscount,
        },
      });
    }

    // Ensure pipeline is on LOST stage and timestamps set
    if (pipeline.stage !== "LOST") {
      await prisma.lotPipeline.update({
        where: { id },
        data: {
          stage: "LOST",
          lostAt: new Date(),
          lostReason: parsed.data.reason,
          submittedPrice: ourPrice,
        },
      });
      await prisma.pipelineHistory.create({
        data: { pipelineId: id, fromStage: pipeline.stage, toStage: "LOST" },
      });
    } else {
      await prisma.lotPipeline.update({
        where: { id },
        data: { lostReason: parsed.data.reason, submittedPrice: ourPrice },
      });
    }

    return NextResponse.json({ success: true });
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
