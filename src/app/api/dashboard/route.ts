import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const authResult = await requireApiAuth();
  if (!authResult.ok) return authResult.response;
  const { companyId } = authResult;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [
    totalTenders,
    newThisWeek,
    pipelineCounts,
    wonThisMonth,
    deadlineToday,
    recentPipeline,
  ] = await Promise.all([
    prisma.tender.count({ where: { companyId } }),
    prisma.tender.count({ where: { companyId, createdAt: { gte: weekAgo } } }),
    prisma.lotPipeline.groupBy({
      by: ["stage"],
      where: { companyId, isArchived: false },
      _count: true,
    }),
    prisma.lotPipeline.findMany({
      where: { companyId, stage: "WON", wonAt: { gte: startOfMonth } },
      include: { lot: true },
    }),
    prisma.lotPipeline.findMany({
      where: {
        companyId,
        isArchived: false,
        stage: { notIn: ["WON", "LOST", "CLOSED"] },
        lot: { tender: { deadline: { gte: today, lt: tomorrow } } },
      },
      include: { lot: { include: { tender: true } } },
    }),
    prisma.lotPipeline.findMany({
      where: { companyId, isArchived: false },
      include: {
        lot: { include: { tender: true } },
        comments: { orderBy: { createdAt: "desc" }, take: 1 },
      },
      orderBy: { updatedAt: "desc" },
      take: 8,
    }),
  ]);

  const wonTotal = wonThisMonth.reduce((sum, p) => {
    return sum + (p.submittedPrice ? Number(p.submittedPrice) : 0);
  }, 0);

  const pipelineMap = Object.fromEntries(
    pipelineCounts.map((p) => [p.stage, p._count])
  );

  return NextResponse.json({
    stats: {
      totalTenders,
      newThisWeek,
      inPipeline: Object.values(pipelineMap).reduce((a, b) => a + b, 0),
      wonThisMonth: wonThisMonth.length,
      wonTotal,
      deadlineToday: deadlineToday.length,
    },
    pipelineCounts: pipelineMap,
    deadlineToday,
    recentPipeline,
  });
}
