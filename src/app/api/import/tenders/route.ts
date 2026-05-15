import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

// Supported column aliases (normalized to internal key)
const COL_MAP: Record<string, string> = {
  "название": "name", "тендер": "name", "наименование": "name",
  "заказчик": "customerName", "организация": "customerName",
  "бин": "customerBin", "бин заказчика": "customerBin",
  "сумма": "totalAmount", "сумма (₸)": "totalAmount", "бюджет": "totalAmount",
  "дедлайн": "deadline", "срок подачи": "deadline", "дата окончания": "deadline",
  "метод": "method", "метод закупки": "method", "способ закупки": "method",
  "лот": "lotName", "название лота": "lotName", "лоты": "lotName",
};

function normalizeHeader(h: string): string {
  return COL_MAP[h.toLowerCase().trim()] ?? "";
}

function parseDate(v: unknown): Date | null {
  if (!v) return null;
  if (typeof v === "number") {
    // Excel serial date
    const d = XLSX.SSF.parse_date_code(v);
    return new Date(d.y, d.m - 1, d.d);
  }
  const d = new Date(String(v));
  return isNaN(d.getTime()) ? null : d;
}

export async function POST(req: NextRequest) {
  const authResult = await requireApiAuth();
  if (!authResult.ok) return authResult.response;
  const { companyId } = authResult;

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const previewOnly = formData.get("preview") === "true";

  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  const arrayBuffer = await file.arrayBuffer();
  const wb = XLSX.read(new Uint8Array(arrayBuffer), { type: "array", cellDates: false });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });

  if (rows.length === 0) return NextResponse.json({ error: "Empty file" }, { status: 400 });

  // Detect column mapping
  const headers = Object.keys(rows[0]);
  const mapping: Record<string, string> = {};
  for (const h of headers) {
    const internal = normalizeHeader(h);
    if (internal) mapping[h] = internal;
  }

  const nameCol = headers.find((h) => normalizeHeader(h) === "name");
  if (!nameCol) {
    return NextResponse.json({
      error: "Не найдена колонка с названием тендера",
      headers,
      suggestion: "Назовите колонку: «Название», «Тендер» или «Наименование»",
    }, { status: 422 });
  }

  // Build parsed rows
  const parsed = rows
    .filter((r) => String(r[nameCol] ?? "").trim())
    .map((r) => {
      const row: Record<string, string | number | Date | null> = {};
      for (const [h, key] of Object.entries(mapping)) {
        row[key] = r[h] as string;
      }
      return {
        name: String(row.name ?? "").trim(),
        customerName: row.customerName ? String(row.customerName).trim() : null,
        customerBin: row.customerBin ? String(row.customerBin).trim().replace(/\D/g, "") : null,
        totalAmount: row.totalAmount ? Number(String(row.totalAmount).replace(/\s/g, "").replace(",", ".")) || null : null,
        deadline: parseDate(row.deadline),
        method: row.method ? String(row.method).trim() : null,
        lotName: row.lotName ? String(row.lotName).trim() : null,
      };
    })
    .filter((r) => r.name.length > 0);

  if (previewOnly) {
    return NextResponse.json({
      total: parsed.length,
      mapping,
      preview: parsed.slice(0, 5),
    });
  }

  // Import
  let created = 0;
  let skipped = 0;

  for (const r of parsed) {
    const externalId = `import_${companyId}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    try {
      const tender = await prisma.tender.create({
        data: {
          companyId,
          externalId,
          source: "OTHER",
          name: r.name,
          customerName: r.customerName,
          customerBin: r.customerBin,
          totalAmount: r.totalAmount,
          deadline: r.deadline,
          method: r.method,
        },
      });

      // Create a lot if separate lot name given, else one lot = tender name
      await prisma.lot.create({
        data: {
          tenderId: tender.id,
          name: r.lotName ?? r.name,
          totalPrice: r.totalAmount,
        },
      });

      // Auto-upsert customer
      if (r.customerBin && r.customerName) {
        await prisma.customer.upsert({
          where: { companyId_bin: { companyId, bin: r.customerBin } },
          update: { name: r.customerName },
          create: { companyId, bin: r.customerBin, name: r.customerName },
        });
      }

      created++;
    } catch {
      skipped++;
    }
  }

  return NextResponse.json({ ok: true, created, skipped });
}
