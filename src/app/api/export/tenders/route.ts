import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";

function escapeCSV(value: string | null | undefined): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function row(cells: (string | null | undefined)[]): string {
  return cells.map(escapeCSV).join(",");
}

export async function GET(req: NextRequest) {
  const authResult = await requireApiAuth();
  if (!authResult.ok) return authResult.response;
  const { companyId } = authResult;

  const params = req.nextUrl.searchParams;
  const search = params.get("search") ?? "";
  const source = params.get("source") ?? "";

  const tenders = await prisma.tender.findMany({
    where: {
      companyId,
      ...(search ? {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { customerName: { contains: search, mode: "insensitive" } },
        ],
      } : {}),
      ...(source ? { source: source as never } : {}),
    },
    include: {
      lots: {
        select: { id: true, name: true, totalPrice: true, pipeline: { select: { stage: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const headers = [
    "ID",
    "Название тендера",
    "Заказчик",
    "БИН заказчика",
    "Метод закупки",
    "Сумма (₸)",
    "Дедлайн",
    "Источник",
    "Дата добавления",
    "Лотов всего",
    "Лотов в воронке",
  ];

  const lines = [
    headers.join(","),
    ...tenders.map((t) => row([
      t.id,
      t.name,
      t.customerName,
      t.customerBin,
      t.method,
      t.totalAmount ? String(Number(t.totalAmount)) : "",
      t.deadline ? t.deadline.toISOString().slice(0, 10) : "",
      t.source,
      t.createdAt.toISOString().slice(0, 10),
      String(t.lots.length),
      String(t.lots.filter((l) => l.pipeline !== null).length),
    ])),
  ];

  const csv = lines.join("\n");
  const filename = `tenders_${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
