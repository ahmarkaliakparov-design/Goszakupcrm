const TELEGRAM_API = "https://api.telegram.org";

export interface TelegramResult {
  ok: boolean;
  error?: string;
}

export async function sendTelegramMessage(
  botToken: string,
  chatId: string,
  text: string,
  parseMode: "HTML" | "Markdown" | "MarkdownV2" = "HTML",
): Promise<TelegramResult> {
  try {
    const res = await fetch(`${TELEGRAM_API}/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: parseMode,
        disable_web_page_preview: true,
      }),
    });
    const data = await res.json();
    return { ok: data.ok === true, error: data.description };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Network error" };
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

interface DeadlineLot {
  lotName: string;
  tenderName: string;
  customerName: string | null;
  daysLeft: number;
  totalAmount: number | null;
  url: string;
}

export function formatDeadlineDigest(lots: DeadlineLot[], baseUrl: string): string {
  const sorted = [...lots].sort((a, b) => a.daysLeft - b.daysLeft);
  const lines = sorted.map((l) => {
    const emoji = l.daysLeft <= 0 ? "🚨" : l.daysLeft === 1 ? "⚠️" : "⏰";
    const when = l.daysLeft <= 0 ? "<b>СЕГОДНЯ</b>" : l.daysLeft === 1 ? "<b>завтра</b>" : `через <b>${l.daysLeft} дн.</b>`;
    const amount = l.totalAmount ? ` · ${formatKzt(l.totalAmount)}` : "";
    return `${emoji} ${when}: <a href="${baseUrl}${l.url}">${escapeHtml(l.lotName)}</a>\n   <i>${escapeHtml(l.customerName ?? l.tenderName)}</i>${amount}`;
  });
  return `📅 <b>Срочные дедлайны (${lots.length})</b>\n\n${lines.join("\n\n")}`;
}

interface NewTenderItem {
  name: string;
  customerName: string | null;
  totalAmount: number | null;
  deadline: string | null;
  url: string;
}

export function formatNewTendersDigest(items: NewTenderItem[], baseUrl: string): string {
  const lines = items.slice(0, 10).map((t, i) => {
    const amount = t.totalAmount ? ` · ${formatKzt(t.totalAmount)}` : "";
    return `${i + 1}. <a href="${baseUrl}${t.url}">${escapeHtml(t.name.slice(0, 80))}</a>\n   <i>${escapeHtml(t.customerName ?? "—")}</i>${amount}`;
  });
  const more = items.length > 10 ? `\n\n<i>...и ещё ${items.length - 10}</i>` : "";
  return `🎯 <b>Новые тендеры по вашим ключевым словам (${items.length})</b>\n\n${lines.join("\n\n")}${more}`;
}

export function formatDailyDigest(
  stats: {
    newTenders: number;
    upcomingDeadlines: number;
    inProgress: number;
    wonThisWeek: number;
    wonAmount: number;
  },
  baseUrl: string,
): string {
  return `🌅 <b>Утренний дайджест Tender CRM</b>

🆕 Новых тендеров: <b>${stats.newTenders}</b>
⏰ Дедлайны на этой неделе: <b>${stats.upcomingDeadlines}</b>
🔥 В активной работе: <b>${stats.inProgress}</b>
🏆 Выиграно за неделю: <b>${stats.wonThisWeek}</b> ${stats.wonAmount > 0 ? `(${formatKzt(stats.wonAmount)})` : ""}

<a href="${baseUrl}/dashboard">Открыть дашборд →</a>`;
}

function formatKzt(amount: number): string {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}М ₸`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)}К ₸`;
  return `${amount.toFixed(0)} ₸`;
}
