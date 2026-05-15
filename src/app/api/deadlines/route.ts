import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const authResult = await requireApiAuth();
  if (!authResult.ok) return authResult.response;
  const { companyId } = authResult;

  const now = new Date();
  const threeMonthsAhead = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const pipelines = await prisma.lotPipeline.findMany({
    where: {
      companyId,
      isArchived: false,
      stage: { notIn: ["WON", "LOST", "CLOSED", "PAYMENT"] },
      lot: {
        tender: {
          deadline: {
            gte: oneMonthAgo,
            lte: threeMonthsAhead,
          },
        },
      },
    },
    include: {
      lot: {
        select: {
          id: true,
          name: true,
          totalPrice: true,
          tender: {
            select: { name: true, customerName: true, deadline: true },
          },
        },
      },
    },
    orderBy: {
      lot: { tender: { deadline: "asc" } },
    },
  });

  const result = pipelines
    .filter((p) => p.lot.tender.deadline !== null)
    .map((p) => ({
      id: p.id,
      lotId: p.lotId,
      lotName: p.lot.name,
      tenderName: p.lot.tender.name,
      customerName: p.lot.tender.customerName,
      deadline: p.lot.tender.deadline!.toISOString(),
      totalPrice: p.lot.totalPrice ? String(p.lot.totalPrice) : null,
      stage: p.stage,
      priority: p.priority,
    }));

  return NextResponse.json(result);
}
