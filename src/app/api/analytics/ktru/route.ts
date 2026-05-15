import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const authResult = await requireApiAuth();
  if (!authResult.ok) return authResult.response;
  const { companyId } = authResult;

  // Get all cost calculations with KTRU info via their lots
  const calcs = await prisma.costCalculation.findMany({
    where: { companyId },
    include: {
      lot: {
        select: {
          ktru: true,
          name: true,
          pipeline: { select: { stage: true, submittedPrice: true } },
        },
      },
    },
  });

  // Group by KTRU code
  const byKtru: Record<string, {
    ktru: string;
    name: string;
    count: number;
    wins: number;
    totalBid: number;
    margins: number[];
    winMargins: number[];
    lossMargins: number[];
  }> = {};

  for (const calc of calcs) {
    const ktru = calc.lot.ktru ?? "Без KTRU";
    const name = calc.lot.name.slice(0, 60);
    if (!byKtru[ktru]) {
      byKtru[ktru] = { ktru, name, count: 0, wins: 0, totalBid: 0, margins: [], winMargins: [], lossMargins: [] };
    }

    const g = byKtru[ktru];
    g.count++;

    const margin = calc.desiredMargin ? Number(calc.desiredMargin) : null;
    const bidPrice = calc.recommendedPrice ? Number(calc.recommendedPrice) : 0;
    if (margin !== null) g.margins.push(margin);
    if (bidPrice > 0) g.totalBid += bidPrice;

    const stage = calc.lot.pipeline?.stage;
    if (stage === "WON") {
      g.wins++;
      if (margin !== null) g.winMargins.push(margin);
    } else if (stage === "LOST") {
      if (margin !== null) g.lossMargins.push(margin);
    }
  }

  function avg(arr: number[]) {
    return arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
  }

  const rows = Object.values(byKtru)
    .map((g) => ({
      ktru: g.ktru,
      name: g.name,
      count: g.count,
      wins: g.wins,
      winRate: g.count > 0 ? Math.round((g.wins / g.count) * 100) : 0,
      avgBid: g.count > 0 ? g.totalBid / g.count : 0,
      avgMargin: avg(g.margins),
      avgWinMargin: avg(g.winMargins),
      avgLossMargin: avg(g.lossMargins),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  return NextResponse.json(rows);
}
