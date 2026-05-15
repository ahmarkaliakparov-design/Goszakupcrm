import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { searchGoszakupTenders, mapBuyMethod } from "@/lib/goszakup";

export async function POST(req: NextRequest) {
  const authResult = await requireApiAuth();
  if (!authResult.ok) return authResult.response;
  const { companyId } = authResult;

  // Parse optional body params
  const body = await req.json().catch(() => ({})) as { keyword?: string };

  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 });

  const settings = (company.settings as Record<string, unknown>) ?? {};
  const token = settings.goszakupToken as string | undefined;
  if (!token) {
    return NextResponse.json({ error: "Goszakup API token not configured" }, { status: 400 });
  }

  // Determine keywords to sync
  let keywords: string[] = [];
  if (body.keyword) {
    keywords = [body.keyword];
  } else {
    const kws = await prisma.keyword.findMany({ where: { companyId, isActive: true } });
    keywords = kws.map((k) => k.word);
  }

  if (keywords.length === 0) {
    return NextResponse.json({ error: "No keywords configured" }, { status: 400 });
  }

  const stats = { fetched: 0, created: 0, updated: 0, lots: 0, errors: [] as string[] };

  for (const keyword of keywords) {
    try {
      const tenders = await searchGoszakupTenders(keyword, token, 50);
      stats.fetched += tenders.length;

      for (const t of tenders) {
        const externalId = String(t.id);
        const deadline = t.endDate ? new Date(t.endDate) : null;
        const publishedAt = t.publishDate ? new Date(t.publishDate) : null;
        const totalAmount = t.totalSum ?? null;
        const method = mapBuyMethod(t.refBuyMethodId ?? null) ?? null;

        // Upsert tender
        const existing = await prisma.tender.findUnique({
          where: { externalId_source_companyId: { externalId, source: "GOSZAKUP", companyId } },
          select: { id: true },
        });

        let tenderId: string;
        if (existing) {
          await prisma.tender.update({
            where: { id: existing.id },
            data: {
              name: t.nameRu,
              customerBin: t.customerBin,
              customerName: t.customerNameRu,
              method,
              deadline,
              totalAmount,
              publishedAt,
              rawData: t as unknown as Prisma.InputJsonValue,
            },
          });
          tenderId = existing.id;
          stats.updated++;
        } else {
          const created = await prisma.tender.create({
            data: {
              externalId,
              source: "GOSZAKUP",
              companyId,
              name: t.nameRu,
              customerBin: t.customerBin,
              customerName: t.customerNameRu,
              method,
              deadline,
              totalAmount,
              publishedAt,
              rawData: t as unknown as Prisma.InputJsonValue,
            },
          });
          tenderId = created.id;
          stats.created++;

          // Auto-upsert customer record if BIN present
          if (t.customerBin && t.customerNameRu) {
            await prisma.customer.upsert({
              where: { companyId_bin: { companyId, bin: t.customerBin } },
              update: { name: t.customerNameRu },
              create: { companyId, bin: t.customerBin, name: t.customerNameRu },
            });
          }
        }

        // Upsert lots
        for (const lot of t.Lots ?? []) {
          const lotExtId = String(lot.id);
          const existingLot = await prisma.lot.findFirst({
            where: { tenderId, externalId: lotExtId },
            select: { id: true },
          });

          if (existingLot) {
            await prisma.lot.update({
              where: { id: existingLot.id },
              data: {
                name: lot.nameRu,
                quantity: lot.count ?? null,
                totalPrice: lot.budget ?? null,
                unit: lot.unitNameRu ?? null,
                rawData: lot as unknown as Prisma.InputJsonValue,
              },
            });
          } else {
            await prisma.lot.create({
              data: {
                tenderId,
                externalId: lotExtId,
                name: lot.nameRu,
                quantity: lot.count ?? null,
                totalPrice: lot.budget ?? null,
                unit: lot.unitNameRu ?? null,
                rawData: lot as unknown as Prisma.InputJsonValue,
              },
            });
            stats.lots++;
          }
        }

        // Create NEW_TENDER notification only for new tenders
        if (!existing) {
          await prisma.notification.create({
            data: {
              companyId,
              type: "NEW_TENDER",
              title: `Новый тендер: ${t.nameRu.slice(0, 60)}`,
              body: `${t.customerNameRu ?? "—"} · ${totalAmount ? `${Number(totalAmount).toLocaleString("ru-KZ")} ₸` : "сумма не указана"}`,
              metadata: { tenderId, keyword },
            },
          });
        }
      }
    } catch (e) {
      stats.errors.push(`Keyword "${keyword}": ${e instanceof Error ? e.message : "Unknown error"}`);
    }
  }

  return NextResponse.json({ ok: true, keywords, ...stats });
}

// GET — return sync status: last synced, keywords count, token status
export async function GET() {
  const authResult = await requireApiAuth();
  if (!authResult.ok) return authResult.response;
  const { companyId } = authResult;

  const company = await prisma.company.findUnique({ where: { id: companyId } });
  const settings = (company?.settings as Record<string, unknown>) ?? {};
  const hasToken = !!settings.goszakupToken;

  const [keywordsCount, totalTenders, lastTender] = await Promise.all([
    prisma.keyword.count({ where: { companyId, isActive: true } }),
    prisma.tender.count({ where: { companyId, source: "GOSZAKUP" } }),
    prisma.tender.findFirst({
      where: { companyId, source: "GOSZAKUP" },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
  ]);

  return NextResponse.json({
    hasToken,
    keywordsCount,
    totalTenders,
    lastSyncedAt: lastTender?.createdAt ?? null,
  });
}
