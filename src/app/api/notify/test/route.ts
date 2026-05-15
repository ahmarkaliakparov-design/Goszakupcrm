import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import { sendTelegramMessage } from "@/lib/telegram";

export async function POST(_req: NextRequest) {
  const authResult = await requireApiAuth();
  if (!authResult.ok) return authResult.response;
  const { companyId } = authResult;

  const company = await prisma.company.findUnique({ where: { id: companyId } });
  const settings = (company?.settings as Record<string, unknown>) ?? {};
  const botToken = settings.telegramBotToken as string | undefined;
  const chatId = settings.telegramChatId as string | undefined;

  if (!botToken || !chatId) {
    return NextResponse.json({ error: "Telegram не настроен (нужны bot token + chat id)" }, { status: 400 });
  }

  const result = await sendTelegramMessage(
    botToken,
    chatId,
    `✅ <b>Tender CRM подключён</b>\n\nТестовое сообщение от ${company?.name ?? "компании"}.\nУведомления о дедлайнах и новых тендерах будут приходить сюда.`,
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? "Telegram API error" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
