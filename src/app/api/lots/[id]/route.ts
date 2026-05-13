import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const authResult = await requireApiAuth();
  if (!authResult.ok) return authResult.response;
  const { companyId } = authResult;

  const lot = await prisma.lot.findFirst({
    where: { id, tender: { companyId } },
    include: {
      tender: true,
      pipeline: {
        include: {
          comments: { orderBy: { createdAt: "asc" } },
          history: { orderBy: { changedAt: "asc" } },
        },
      },
      costCalculations: { orderBy: { createdAt: "desc" } },
      aiAnalyses: { orderBy: { createdAt: "desc" }, take: 3 },
    },
  });

  if (!lot) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(lot);
}
