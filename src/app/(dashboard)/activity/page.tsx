"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, MessageSquare, CheckSquare, FileText, Bell, X, RefreshCw } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import Link from "next/link";

interface Event {
  id: string;
  type: "stage" | "comment" | "task" | "loss" | "notification";
  timestamp: string;
  title: string;
  detail: string;
  lotId?: string;
  lotName?: string;
}

const TYPE_CONFIG: Record<Event["type"], { icon: typeof Bell; color: string; bg: string; ring: string; label: string }> = {
  stage: { icon: ArrowRight, color: "text-blue-600", bg: "bg-blue-50", ring: "ring-blue-200", label: "Этап" },
  comment: { icon: MessageSquare, color: "text-purple-600", bg: "bg-purple-50", ring: "ring-purple-200", label: "Комментарий" },
  task: { icon: CheckSquare, color: "text-green-600", bg: "bg-green-50", ring: "ring-green-200", label: "Задача" },
  loss: { icon: X, color: "text-red-600", bg: "bg-red-50", ring: "ring-red-200", label: "Проигрыш" },
  notification: { icon: FileText, color: "text-amber-600", bg: "bg-amber-50", ring: "ring-amber-200", label: "Тендер" },
};

function formatDay(dateStr: string): string {
  const d = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dDate = new Date(d);
  dDate.setHours(0, 0, 0, 0);
  const diff = Math.round((today.getTime() - dDate.getTime()) / (24 * 60 * 60 * 1000));
  if (diff === 0) return "Сегодня";
  if (diff === 1) return "Вчера";
  if (diff < 7) return `${diff} дн. назад`;
  return d.toLocaleDateString("ru-KZ", { day: "numeric", month: "long" });
}

export default function ActivityPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Event["type"] | "all">("all");

  useEffect(() => {
    fetch("/api/activity")
      .then((r) => r.json())
      .then((d) => { setEvents(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = filter === "all" ? events : events.filter((e) => e.type === filter);

  // Group by day
  const groups = new Map<string, Event[]>();
  for (const e of filtered) {
    const key = formatDay(e.timestamp);
    const arr = groups.get(key) ?? [];
    arr.push(e);
    groups.set(key, arr);
  }

  return (
    <div>
      <Header title="Лента активности" subtitle="Хронология событий за последние 30 дней" />

      <div className="p-6 max-w-3xl space-y-4">
        {/* Filter chips */}
        <div className="flex gap-2 flex-wrap">
          {(["all", "stage", "task", "comment", "loss", "notification"] as const).map((t) => {
            const config = t === "all" ? null : TYPE_CONFIG[t];
            const count = t === "all" ? events.length : events.filter((e) => e.type === t).length;
            return (
              <button
                key={t}
                onClick={() => setFilter(t)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-1.5 ${
                  filter === t
                    ? "bg-gray-900 text-white"
                    : "bg-white border border-gray-200 text-gray-600 hover:border-gray-300"
                }`}
              >
                {config && <config.icon className="h-3.5 w-3.5" />}
                {config?.label ?? "Все события"}
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  filter === t ? "bg-gray-700" : "bg-gray-100"
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-gray-400 text-sm py-8">
            <RefreshCw className="h-4 w-4 animate-spin" />Загрузка...
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Bell className="h-10 w-10 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">Нет событий за этот период</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {Array.from(groups.entries()).map(([day, items]) => (
              <div key={day}>
                <h3 className="text-xs uppercase tracking-wide font-semibold text-gray-400 mb-3 sticky top-0 bg-white py-1.5 z-10">
                  {day}
                </h3>
                <div className="relative pl-7 space-y-3">
                  {/* Timeline rail */}
                  <div className="absolute left-3 top-2 bottom-2 w-px bg-gray-100" />

                  {items.map((event) => {
                    const config = TYPE_CONFIG[event.type];
                    const Icon = config.icon;
                    const time = new Date(event.timestamp).toLocaleTimeString("ru-KZ", {
                      hour: "2-digit",
                      minute: "2-digit",
                    });

                    const content = (
                      <Card className="hover:shadow-sm transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900">{event.title}</p>
                              <p className="text-xs text-gray-500 mt-1 line-clamp-2">{event.detail}</p>
                              {event.lotName && event.type !== "notification" && (
                                <p className="text-[11px] text-blue-600 mt-1.5 font-medium">
                                  → {event.lotName}
                                </p>
                              )}
                            </div>
                            <span className="text-[11px] text-gray-400 whitespace-nowrap shrink-0">{time}</span>
                          </div>
                        </CardContent>
                      </Card>
                    );

                    return (
                      <div key={event.id} className="relative">
                        {/* Bullet */}
                        <div className={`absolute -left-[19px] top-3 w-3 h-3 rounded-full ${config.bg} ring-4 ring-white border ${config.ring.replace("ring-", "border-")} z-10`} />
                        <div className={`absolute -left-[22px] top-2 w-5 h-5 rounded-full ${config.bg} flex items-center justify-center`}>
                          <Icon className={`h-2.5 w-2.5 ${config.color}`} />
                        </div>

                        {event.lotId ? (
                          <Link href={`/lots/${event.lotId}`}>{content}</Link>
                        ) : (
                          content
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
