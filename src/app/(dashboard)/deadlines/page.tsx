"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, daysUntil } from "@/lib/utils";
import { PIPE_STAGE_LABELS, PIPE_STAGE_COLORS } from "@/types";
import type { PipeStage } from "@/types";
import { CalendarDays, AlertTriangle, Clock, CheckCircle2, RefreshCw, ChevronRight } from "lucide-react";
import Link from "next/link";

interface DeadlineItem {
  id: string;
  lotId: string;
  lotName: string;
  tenderName: string;
  customerName: string | null;
  deadline: string;
  totalPrice: string | null;
  stage: string;
  priority: string;
}

const PRIORITY_COLORS: Record<string, string> = {
  HIGH: "text-red-600 bg-red-50 border-red-200",
  MEDIUM: "text-amber-600 bg-amber-50 border-amber-200",
  LOW: "text-gray-500 bg-gray-50 border-gray-200",
};

function groupByDate(items: DeadlineItem[]): Array<{ label: string; date: string; items: DeadlineItem[] }> {
  const map = new Map<string, DeadlineItem[]>();
  for (const item of items) {
    const d = item.deadline.slice(0, 10);
    const arr = map.get(d) ?? [];
    arr.push(item);
    map.set(d, arr);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, items]) => ({
      date,
      label: formatDateLabel(date),
      items,
    }));
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((d.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));

  const weekday = d.toLocaleDateString("ru-KZ", { weekday: "long" });
  const dateFormatted = d.toLocaleDateString("ru-KZ", { day: "numeric", month: "long" });

  if (diffDays === 0) return `Сегодня, ${dateFormatted}`;
  if (diffDays === 1) return `Завтра, ${dateFormatted}`;
  if (diffDays === -1) return `Вчера, ${dateFormatted}`;
  if (diffDays < 0) return `${dateFormatted} (просрочено)`;
  if (diffDays <= 7) return `${weekday.charAt(0).toUpperCase() + weekday.slice(1)}, ${dateFormatted}`;
  return dateFormatted;
}

type ViewMode = "upcoming" | "overdue" | "all";

export default function DeadlinesPage() {
  const [items, setItems] = useState<DeadlineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<ViewMode>("upcoming");

  useEffect(() => {
    fetch("/api/deadlines")
      .then((r) => r.json())
      .then((d) => { setItems(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const filtered = items.filter((item) => {
    const d = new Date(item.deadline);
    const isOverdue = d < now;
    if (mode === "upcoming") return !isOverdue;
    if (mode === "overdue") return isOverdue;
    return true;
  });

  const overdueCount = items.filter((item) => new Date(item.deadline) < now).length;
  const todayCount = items.filter((item) => item.deadline.slice(0, 10) === now.toISOString().slice(0, 10)).length;

  const groups = groupByDate(filtered);

  return (
    <div>
      <Header
        title="Дедлайны"
        subtitle="Сроки подачи заявок по активным лотам"
        actions={
          <Button size="sm" variant="outline" onClick={() => window.location.reload()}>
            <RefreshCw className="h-4 w-4 mr-1.5" />Обновить
          </Button>
        }
      />

      <div className="p-6 max-w-4xl space-y-6">
        {/* Stats strip */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { icon: AlertTriangle, label: "Просроченных", value: overdueCount, color: "text-red-600", bg: "bg-red-50", mode: "overdue" as ViewMode },
            { icon: Clock, label: "Сегодня", value: todayCount, color: "text-amber-600", bg: "bg-amber-50", mode: "upcoming" as ViewMode },
            { icon: CalendarDays, label: "Всего активных", value: items.filter((i) => new Date(i.deadline) >= now).length, color: "text-blue-600", bg: "bg-blue-50", mode: "all" as ViewMode },
          ].map((s) => (
            <button
              key={s.label}
              onClick={() => setMode(s.mode)}
              className={`rounded-xl border p-4 flex items-center gap-4 transition-all text-left ${
                mode === s.mode ? "border-blue-400 shadow-sm" : "border-gray-200 hover:border-gray-300"
              } bg-white`}
            >
              <div className={`p-2.5 rounded-lg ${s.bg}`}>
                <s.icon className={`h-5 w-5 ${s.color}`} />
              </div>
              <div>
                <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                <div className="text-xs text-gray-500">{s.label}</div>
              </div>
            </button>
          ))}
        </div>

        {/* View mode tabs */}
        <div className="flex gap-1 border-b border-gray-200">
          {(["upcoming", "overdue", "all"] as ViewMode[]).map((m) => {
            const labels = { upcoming: "Предстоящие", overdue: "Просроченные", all: "Все" };
            return (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  mode === m ? "border-blue-600 text-blue-700" : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                {labels[m]}
                {m === "overdue" && overdueCount > 0 && (
                  <span className="ml-1.5 bg-red-100 text-red-600 text-[10px] px-1.5 py-0.5 rounded-full font-semibold">
                    {overdueCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-gray-400 text-sm py-8">
            <RefreshCw className="h-4 w-4 animate-spin" />Загрузка...
          </div>
        ) : groups.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <CheckCircle2 className="h-12 w-12 text-green-400 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">
                {mode === "overdue" ? "Просроченных дедлайнов нет" : "Нет предстоящих дедлайнов"}
              </p>
              <p className="text-gray-400 text-sm mt-1">Добавьте тендеры в воронку</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {groups.map((group) => {
              const groupDate = new Date(group.date);
              const isOverdue = groupDate < now;
              const isToday = group.date === now.toISOString().slice(0, 10);

              return (
                <div key={group.date}>
                  <div className={`flex items-center gap-2 mb-3 ${isOverdue ? "text-red-600" : isToday ? "text-amber-600" : "text-gray-600"}`}>
                    <div className={`w-2 h-2 rounded-full ${isOverdue ? "bg-red-500" : isToday ? "bg-amber-500" : "bg-gray-300"}`} />
                    <h3 className="text-sm font-semibold uppercase tracking-wide">{group.label}</h3>
                    <span className="text-xs opacity-60">({group.items.length})</span>
                  </div>

                  <div className="space-y-2">
                    {group.items.map((item) => {
                      const days = daysUntil(item.deadline) ?? 0;
                      return (
                        <Link key={item.id} href={`/lots/${item.lotId}`}>
                          <div className={`flex items-center gap-4 p-4 rounded-xl border bg-white hover:shadow-sm transition-all group ${
                            isOverdue ? "border-red-200 hover:border-red-300" :
                            isToday ? "border-amber-200 hover:border-amber-300" :
                            "border-gray-200 hover:border-gray-300"
                          }`}>
                            {/* Days badge */}
                            <div className={`shrink-0 w-14 text-center rounded-lg py-2 ${
                              isOverdue ? "bg-red-100 text-red-700" :
                              isToday ? "bg-amber-100 text-amber-700" :
                              days <= 3 ? "bg-orange-100 text-orange-700" :
                              "bg-blue-50 text-blue-700"
                            }`}>
                              <div className="text-lg font-bold leading-none">{isOverdue ? Math.abs(days) : days}</div>
                              <div className="text-[10px] mt-0.5">{isOverdue ? "дн. назад" : "дней"}</div>
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <p className="text-sm font-medium text-gray-900 truncate">{item.lotName}</p>
                                <Badge
                                  className={`text-[10px] px-1.5 py-0.5 shrink-0 border ${
                                    PRIORITY_COLORS[item.priority] ?? PRIORITY_COLORS.LOW
                                  }`}
                                >
                                  {item.priority}
                                </Badge>
                              </div>
                              <p className="text-xs text-gray-500 truncate">{item.customerName ?? item.tenderName}</p>
                            </div>

                            <div className="shrink-0 flex items-center gap-3">
                              {item.totalPrice && (
                                <span className="text-sm font-medium text-gray-700">
                                  {formatCurrency(Number(item.totalPrice))}
                                </span>
                              )}
                              <span
                                className={`text-xs px-2 py-1 rounded-full font-medium ${
                                  PIPE_STAGE_COLORS[item.stage as PipeStage] ?? "bg-gray-100 text-gray-600"
                                }`}
                              >
                                {PIPE_STAGE_LABELS[item.stage as PipeStage] ?? item.stage}
                              </span>
                              <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
