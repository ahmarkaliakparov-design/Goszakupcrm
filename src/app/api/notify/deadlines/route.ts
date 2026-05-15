import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendTelegramMessage, formatDeadlineDigest } from "@/lib/telegram";

// Cron-style endpoint: scan all companies, find upcoming deadlines, push to Telegram.
// Protected by CRON_SECRET header to prevent abuse.
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const now = new Date();
  const horizon = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  const companies = await prisma.company.findMany();
  const summary: Array<{ company: string; sent: boolean; count: number; error?: string }> = [];

  for (const company of companies) {
    const settings = (company.settings as Record<string, unknown>) ?? {};
    const botToken = settings.telegramBotToken as string | undefined;
    const chatId = settings.telegramChatId as string | undefined;
    if (!botToken || !chatId) {
      summary.push({ company: company.name, sent: false, count: 0, error: "no telegram" });
      continue;
    }

    const pipelines = await prisma.lotPipeline.findMany({
      where: {
        companyId: company.id,
        isArchived: false,
        stage: { notIn: ["WON", "LOST", "CONTRACT", "DELIVERY", "PAYMENT", "CLOSED"] },
        lot: {
          tender: {
            deadline: { gte: now, lte: horizon },
          },
        },
      },
      include: {
        lot: { include: { tender: { select: { name: true, customerName: true, deadline: true, totalAmount: true } } } },
      },
    });

    if (pipelines.length === 0) {
      summary.push({ company: company.name, sent: false, count: 0 });
      continue;
    }

    const items = pipelines.map((p) => {
      const deadline = p.lot.tender.deadline!;
      const daysLeft = Math.ceil((deadline.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
      return {
        lotName: p.lot.name,
        tenderName: p.lot.tender.name,
        customerName: p.lot.tender.customerName,
        daysLeft,
        totalAmount: p.lot.tender.totalAmount ? Number(p.lot.tender.totalAmount) : null,
        url: `/lots/${p.lot.id}`,
      };
    });

    const text = formatDeadlineDigest(items, baseUrl);
    const result = await sendTelegramMessage(botToken, chatId, text);

    // Record notifications
    await prisma.notification.create({
      data: {
        companyId: company.id,
        type: "DEADLINE_APPROACHING",
        title: `Срочные дедлайны: ${items.length} лотов`,
        body: items.map((i) => i.lotName).join(", "),
        metadata: { count: items.length, telegramSent: result.ok },
      },
    });

    summary.push({ company: company.name, sent: result.ok, count: items.length, error: result.error });
  }

  return NextResponse.json({ processed: companies.length, summary });
}
