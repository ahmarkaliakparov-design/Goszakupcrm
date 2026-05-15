import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const authResult = await requireApiAuth();
  if (!authResult.ok) return authResult.response;
  const { companyId } = authResult;

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  if (q.length < 2) return NextResponse.json({ results: [] });

  const [tenders, lots, suppliers, customers, competitors] = await Promise.all([
    prisma.tender.findMany({
      where: {
        companyId,
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { customerName: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { id: true, name: true, customerName: true },
      take: 5,
    }),
    prisma.lot.findMany({
      where: {
        tender: { companyId },
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { ktru: { contains: q } },
        ],
      },
      select: {
        id: true, name: true, ktru: true,
        tender: { select: { name: true, customerName: true } },
        pipeline: { select: { stage: true } },
      },
      take: 5,
    }),
    prisma.supplier.findMany({
      where: {
        companyId,
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { category: { contains: q, mode: "insensitive" } },
          { bin: { contains: q } },
        ],
      },
      select: { id: true, name: true, category: true },
      take: 3,
    }),
    prisma.customer.findMany({
      where: {
        companyId,
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { bin: { contains: q } },
        ],
      },
      select: { id: true, name: true, bin: true },
      take: 3,
    }),
    prisma.competitor.findMany({
      where: {
        companyId,
        name: { contains: q, mode: "insensitive" },
      },
      select: { id: true, name: true, wins: true },
      take: 3,
    }),
  ]);

  const results = [
    ...tenders.map((t) => ({
      type: "tender" as const,
      id: t.id,
      title: t.name,
      subtitle: t.customerName ?? "",
      href: `/tenders/${t.id}`,
    })),
    ...lots.map((l) => ({
      type: "lot" as const,
      id: l.id,
      title: l.name,
      subtitle: `${l.tender.customerName ?? l.tender.name}${l.pipeline ? ` · ${l.pipeline.stage}` : ""}`,
      href: `/lots/${l.id}`,
    })),
    ...suppliers.map((s) => ({
      type: "supplier" as const,
      id: s.id,
      title: s.name,
      subtitle: s.category ?? "Поставщик",
      href: `/suppliers`,
    })),
    ...customers.map((c) => ({
      type: "customer" as const,
      id: c.id,
      title: c.name,
      subtitle: `БИН ${c.bin}`,
      href: `/customers/${c.id}`,
    })),
    ...competitors.map((c) => ({
      type: "competitor" as const,
      id: c.id,
      title: c.name,
      subtitle: `${c.wins} побед`,
      href: `/competitors/${c.id}`,
    })),
  ];

  return NextResponse.json({ results });
}
