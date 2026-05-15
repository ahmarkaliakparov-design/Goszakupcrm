import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendTelegramMessage, formatDailyDigest } from "@/lib/telegram";

// Morning digest cron — send daily stats to all configured companies.
// Protected by CRON_SECRET header.
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const companies = await prisma.company.findMany();
  const summary: Array<{ company: string; sent: boolean; error?: string }> = [];

  for (const company of companies) {
    const settings = (company.settings as Record<string, unknown>) ?? {};
    const botToken = settings.telegramBotToken as string | undefined;
    const chatId = settings.telegramChatId as string | undefined;
    if (!botToken || !chatId) {
      summary.push({ company: company.name, sent: false, error: "no telegram" });
      continue;
    }

    const [newTenders, upcomingDeadlines, inProgress, wonPipelines] = await Promise.all([
      prisma.tender.count({
        where: { companyId: company.id, createdAt: { gte: yesterday } },
      }),
      prisma.lotPipeline.count({
        where: {
          companyId: company.id,
          isArchived: false,
          stage: { notIn: ["WON", "LOST", "CONTRACT", "DELIVERY", "PAYMENT", "CLOSED"] },
          lot: { tender: { deadline: { gte: now, lte: nextWeek } } },
        },
      }),
      prisma.lotPipeline.count({
        where: {
          companyId: company.id,
          isArchived: false,
          stage: { notIn: ["FOUND", "WON", "LOST", "CLOSED"] },
        },
      }),
      prisma.lotPipeline.findMany({
        where: {
          companyId: company.id,
          stage: "WON",
          updatedAt: { gte: weekAgo },
        },
        include: { lot: { select: { totalPrice: true } } },
      }),
    ]);

    const wonAmount = wonPipelines.reduce(
      (sum, p) => sum + (p.submittedPrice ? Number(p.submittedPrice) : Number(p.lot.totalPrice ?? 0)),
      0
    );

    const text = formatDailyDigest(
      {
        newTenders,
        upcomingDeadlines,
        inProgress,
        wonThisWeek: wonPipelines.length,
        wonAmount,
      },
      baseUrl,
    );

    const result = await sendTelegramMessage(botToken, chatId, text);

    await prisma.notification.create({
      data: {
        companyId: company.id,
        type: "SYSTEM",
        title: "Утренний дайджест отправлен",
        body: `Новых: ${newTenders}, В работе: ${inProgress}, Выиграно: ${wonPipelines.length}`,
        metadata: { telegramSent: result.ok },
      },
    });

    summary.push({ company: company.name, sent: result.ok, error: result.error });
  }

  return NextResponse.json({ processed: companies.length, summary });
}
