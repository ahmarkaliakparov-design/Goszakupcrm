import { prisma } from "@/lib/prisma";

export interface KtruIntelligence {
  ktru: string;
  totalCalculations: number;
  totalWonAmount: number;
  totalLostAmount: number;
  wonCount: number;
  lostCount: number;
  winRate: number;
  avgPurchasePrice: number | null;
  avgRecommendedPrice: number | null;
  avgWinningPrice: number | null;
  avgMarginWon: number | null;
  avgMarginLost: number | null;
  suggestedMargin: number | null;
  suggestedPrice: number | null;
  recentCalculations: Array<{
    id: string;
    lotName: string;
    tenderName: string;
    purchasePrice: number;
    recommendedPrice: number;
    desiredMargin: number;
    submittedPrice: number | null;
    stage: string;
    winningPrice: number | null;
    createdAt: Date;
  }>;
}

export async function getKtruIntelligence(
  companyId: string,
  ktru: string,
): Promise<KtruIntelligence> {
  const calcs = await prisma.costCalculation.findMany({
    where: {
      companyId,
      lot: { ktru },
    },
    include: {
      lot: {
        include: {
          tender: { select: { name: true } },
          pipeline: { include: { lossRecord: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  let wonCount = 0;
  let lostCount = 0;
  let wonAmount = 0;
  let lostAmount = 0;
  const wonMargins: number[] = [];
  const lostMargins: number[] = [];
  const purchasePrices: number[] = [];
  const recommendedPrices: number[] = [];
  const winningPrices: number[] = [];

  const recent = calcs.slice(0, 10).map((c) => {
    const stage = c.lot.pipeline?.stage ?? "—";
    const submitted = c.lot.pipeline?.submittedPrice ? Number(c.lot.pipeline.submittedPrice) : null;
    const winning = c.lot.pipeline?.lossRecord?.winningPrice
      ? Number(c.lot.pipeline.lossRecord.winningPrice)
      : null;

    purchasePrices.push(Number(c.purchasePrice));
    recommendedPrices.push(Number(c.recommendedPrice));

    if (stage === "WON" || stage === "CONTRACT" || stage === "PAYMENT" || stage === "DELIVERY") {
      wonCount++;
      wonAmount += submitted ?? Number(c.recommendedPrice);
      wonMargins.push(Number(c.desiredMargin));
    }
    if (stage === "LOST") {
      lostCount++;
      lostAmount += submitted ?? 0;
      lostMargins.push(Number(c.desiredMargin));
      if (winning) winningPrices.push(winning);
    }

    return {
      id: c.id,
      lotName: c.lot.name,
      tenderName: c.lot.tender.name,
      purchasePrice: Number(c.purchasePrice),
      recommendedPrice: Number(c.recommendedPrice),
      desiredMargin: Number(c.desiredMargin),
      submittedPrice: submitted,
      stage,
      winningPrice: winning,
      createdAt: c.createdAt,
    };
  });

  const avg = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);
  const total = wonCount + lostCount;
  const winRate = total ? wonCount / total : 0;

  // Smart margin suggestion: average of WON margins, fall back to halfway between WON and LOST
  let suggestedMargin: number | null = null;
  if (wonMargins.length > 0) {
    suggestedMargin = avg(wonMargins);
    if (lostMargins.length > 0 && suggestedMargin !== null) {
      // If we have losses with lower margins, slight downward bias
      const minWonMargin = Math.min(...wonMargins);
      const maxLostMargin = Math.max(...lostMargins);
      if (maxLostMargin > minWonMargin) {
        // Conservative: use min won margin
        suggestedMargin = minWonMargin * 0.95;
      }
    }
  } else if (lostMargins.length > 0) {
    suggestedMargin = Math.min(...lostMargins) * 0.85;
  }

  const avgPurchase = avg(purchasePrices);
  const suggestedPrice = suggestedMargin !== null && avgPurchase !== null
    ? avgPurchase * (1 + suggestedMargin / 100)
    : null;

  return {
    ktru,
    totalCalculations: calcs.length,
    totalWonAmount: wonAmount,
    totalLostAmount: lostAmount,
    wonCount,
    lostCount,
    winRate,
    avgPurchasePrice: avgPurchase,
    avgRecommendedPrice: avg(recommendedPrices),
    avgWinningPrice: avg(winningPrices),
    avgMarginWon: avg(wonMargins),
    avgMarginLost: avg(lostMargins),
    suggestedMargin,
    suggestedPrice,
    recentCalculations: recent,
  };
}

export interface CustomerIntelligence {
  customer: { id: string; name: string; bin: string; region: string | null; paymentDays: number | null; rating: number | null };
  totalTenders: number;
  participatedTenders: number;
  wonCount: number;
  lostCount: number;
  winRate: number;
  totalWonAmount: number;
  avgTenderAmount: number;
  avgPaymentDays: number | null;
  topCompetitors: Array<{ name: string; wins: number }>;
  riskScore: number; // 0-100, lower is safer
  riskLevel: "low" | "medium" | "high";
  riskFactors: string[];
}

export async function getCustomerIntelligence(
  companyId: string,
  customerId: string,
): Promise<CustomerIntelligence | null> {
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, companyId },
  });
  if (!customer) return null;

  const tenders = await prisma.tender.findMany({
    where: { companyId, customerBin: customer.bin },
    include: {
      lots: {
        include: {
          pipeline: { include: { lossRecord: { include: { competitor: true } } } },
        },
      },
    },
  });

  let wonCount = 0;
  let lostCount = 0;
  let wonAmount = 0;
  let totalAmount = 0;
  let participated = 0;
  const competitorCounts: Record<string, number> = {};
  const paymentLags: number[] = [];

  for (const t of tenders) {
    totalAmount += Number(t.totalAmount ?? 0);
    for (const lot of t.lots) {
      const p = lot.pipeline;
      if (!p) continue;
      participated++;

      if (["WON", "CONTRACT", "DELIVERY", "PAYMENT", "CLOSED"].includes(p.stage)) {
        wonCount++;
        wonAmount += Number(p.submittedPrice ?? lot.totalPrice ?? 0);
      } else if (p.stage === "LOST") {
        lostCount++;
        if (p.lossRecord?.competitor) {
          const name = p.lossRecord.competitor.name;
          competitorCounts[name] = (competitorCounts[name] ?? 0) + 1;
        }
      }

      if (p.paidAt && p.contractAt) {
        const lag = (p.paidAt.getTime() - p.contractAt.getTime()) / (24 * 60 * 60 * 1000);
        paymentLags.push(lag);
      }
    }
  }

  const finished = wonCount + lostCount;
  const winRate = finished ? wonCount / finished : 0;
  const avgPaymentDays = paymentLags.length
    ? paymentLags.reduce((a, b) => a + b, 0) / paymentLags.length
    : null;

  // Risk scoring
  let risk = 0;
  const factors: string[] = [];
  if (customer.isBlacklist) {
    risk += 80;
    factors.push("В чёрном списке");
  }
  if ((customer.paymentDays ?? 0) > 60) {
    risk += 20;
    factors.push(`Срок оплаты ${customer.paymentDays} дней`);
  }
  if (avgPaymentDays !== null && avgPaymentDays > (customer.paymentDays ?? 30) * 1.2) {
    risk += 25;
    factors.push(`Платит на ${Math.round(avgPaymentDays)}-й день (выше заявленного)`);
  }
  if (finished >= 3 && winRate < 0.2) {
    risk += 30;
    factors.push(`Низкий win rate (${Math.round(winRate * 100)}%)`);
  }
  if ((customer.rating ?? 3) <= 2) {
    risk += 15;
    factors.push(`Низкий рейтинг (${customer.rating}/5)`);
  }
  risk = Math.min(risk, 100);
  const riskLevel: "low" | "medium" | "high" = risk >= 60 ? "high" : risk >= 30 ? "medium" : "low";

  const topCompetitors = Object.entries(competitorCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, wins]) => ({ name, wins }));

  return {
    customer: {
      id: customer.id,
      name: customer.name,
      bin: customer.bin,
      region: customer.region,
      paymentDays: customer.paymentDays,
      rating: customer.rating,
    },
    totalTenders: tenders.length,
    participatedTenders: participated,
    wonCount,
    lostCount,
    winRate,
    totalWonAmount: wonAmount,
    avgTenderAmount: tenders.length ? totalAmount / tenders.length : 0,
    avgPaymentDays,
    topCompetitors,
    riskScore: risk,
    riskLevel,
    riskFactors: factors,
  };
}
