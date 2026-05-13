import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const authResult = await requireApiAuth();
  if (!authResult.ok) return authResult.response;
  const { companyId } = authResult;

  const now = new Date();

  const pipelineDistribution = await prisma.lotPipeline.groupBy({
    by: ["stage"],
    where: { companyId },
    _count: true,
  });

  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const history = await prisma.pipelineHistory.findMany({
    where: {
      pipeline: { companyId },
      changedAt: { gte: sixMonthsAgo },
    },
    include: { pipeline: { select: { lot: { select: { tender: { select: { totalAmount: true } } } } } } },
    orderBy: { changedAt: "asc" },
  });

  const monthlyMap: Record<string, { count: number; won: number; amount: number }> = {};
  for (const h of history) {
    const key = `${h.changedAt.getFullYear()}-${String(h.changedAt.getMonth() + 1).padStart(2, "0")}`;
    if (!monthlyMap[key]) monthlyMap[key] = { count: 0, won: 0, amount: 0 };
    monthlyMap[key].count++;
    if (h.toStage === "WON") {
      monthlyMap[key].won++;
      monthlyMap[key].amount += Number(h.pipeline?.lot?.tender?.totalAmount ?? 0);
    }
  }

  const monthlyData = Object.entries(monthlyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({
      month,
      label: new Date(month + "-01").toLocaleDateString("ru-KZ", { month: "short", year: "2-digit" }),
      ...data,
      winRate: data.count > 0 ? Math.round((data.won / data.count) * 100) : 0,
    }));

  const tenders = await prisma.tender.findMany({
    where: { companyId },
    select: { customerName: true, totalAmount: true },
  });
  const customerMap: Record<string, { count: number; amount: number }> = {};
  for (const t of tenders) {
    const key = t.customerName ?? "Неизвестный";
    if (!customerMap[key]) customerMap[key] = { count: 0, amount: 0 };
    customerMap[key].count++;
    customerMap[key].amount += Number(t.totalAmount ?? 0);
  }
  const topCustomers = Object.entries(customerMap)
    .sort(([, a], [, b]) => b.count - a.count)
    .slice(0, 7)
    .map(([name, data]) => ({ name: name.length > 30 ? name.slice(0, 30) + "…" : name, ...data }));

  return NextResponse.json({ pipelineDistribution, monthlyData, topCustomers });
}
