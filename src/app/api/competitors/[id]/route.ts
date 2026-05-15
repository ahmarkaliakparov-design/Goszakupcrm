import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const authResult = await requireApiAuth();
  if (!authResult.ok) return authResult.response;
  const { companyId } = authResult;

  const competitor = await prisma.competitor.findFirst({
    where: { id, companyId },
    include: {
      lossRecords: {
        orderBy: { createdAt: "desc" },
        include: {
          pipeline: {
            include: {
              lot: {
                include: {
                  tender: { select: { name: true, customerName: true, customerBin: true } },
                },
              },
            },
          },
        },
      },
    },
  });
  if (!competitor) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(competitor);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const authResult = await requireApiAuth();
  if (!authResult.ok) return authResult.response;
  const { companyId } = authResult;

  await prisma.competitor.deleteMany({ where: { id, companyId } });
  return NextResponse.json({ success: true });
}
