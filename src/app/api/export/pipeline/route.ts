import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";
import { PIPE_STAGE_LABELS } from "@/types";
import type { PipeStage } from "@/types";

const LOSS_REASON_LABELS: Record<string, string> = {
  PRICE_TOO_HIGH: "Высокая цена",
  WRONG_SPECS: "Не соответствие ТЗ",
  LATE_SUBMISSION: "Опоздание",
  DOCUMENTS: "Документы",
  DISQUALIFIED: "Дисквалификация",
  CUSTOMER_PREFERENCE: "Предпочтение заказчика",
  OTHER: "Прочее",
};

export async function GET() {
  const authResult = await requireApiAuth();
  if (!authResult.ok) return authResult.response;
  const { companyId } = authResult;

  const pipelines = await prisma.lotPipeline.findMany({
    where: { companyId },
    include: {
      lot: {
        include: {
          tender: {
            select: { name: true, customerName: true, customerBin: true, deadline: true, method: true },
          },
        },
      },
      lossRecord: { select: { reason: true, winnerName: true, winningPrice: true, ourPrice: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  const data = pipelines.map((p) => ({
    "ID лота": p.lotId,
    "Лот": p.lot.name,
    "Тендер": p.lot.tender.name,
    "Заказчик": p.lot.tender.customerName ?? "",
    "БИН заказчика": p.lot.tender.customerBin ?? "",
    "Метод": p.lot.tender.method ?? "",
    "Дедлайн": p.lot.tender.deadline ? p.lot.tender.deadline.toISOString().slice(0, 10) : "",
    "Стадия": PIPE_STAGE_LABELS[p.stage as PipeStage] ?? p.stage,
    "Приоритет": p.priority,
    "Сумма лота (₸)": p.lot.totalPrice ? Number(p.lot.totalPrice) : "",
    "Наша цена (₸)": p.submittedPrice ? Number(p.submittedPrice) : (p.lossRecord?.ourPrice ? Number(p.lossRecord.ourPrice) : ""),
    "Цена победителя (₸)": p.lossRecord?.winningPrice ? Number(p.lossRecord.winningPrice) : "",
    "Победитель": p.lossRecord?.winnerName ?? "",
    "Причина проигрыша": p.lossRecord?.reason ? (LOSS_REASON_LABELS[p.lossRecord.reason] ?? "") : "",
    "Архив": p.isArchived ? "Да" : "Нет",
    "Подано": p.submittedAt ? p.submittedAt.toISOString().slice(0, 10) : "",
    "Выиграно": p.wonAt ? p.wonAt.toISOString().slice(0, 10) : "",
    "Проиграно": p.lostAt ? p.lostAt.toISOString().slice(0, 10) : "",
    "Последнее обновление": p.updatedAt.toISOString().slice(0, 10),
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);

  // Column widths
  const colWidths = [10, 35, 40, 25, 14, 20, 12, 16, 10, 16, 16, 16, 25, 20, 12, 5, 12, 12, 12, 18];
  ws["!cols"] = colWidths.map((w) => ({ wch: w }));

  XLSX.utils.book_append_sheet(wb, ws, "Воронка");

  // Summary sheet
  const stages = Object.entries(
    pipelines.reduce<Record<string, number>>((acc, p) => {
      const label = PIPE_STAGE_LABELS[p.stage as PipeStage] ?? p.stage;
      acc[label] = (acc[label] ?? 0) + 1;
      return acc;
    }, {})
  ).map(([stage, count]) => ({ Стадия: stage, Количество: count }));

  const ws2 = XLSX.utils.json_to_sheet(stages);
  ws2["!cols"] = [{ wch: 20 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, ws2, "Сводка");

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  const filename = `pipeline_${new Date().toISOString().slice(0, 10)}.xlsx`;

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
