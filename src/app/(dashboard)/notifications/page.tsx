"use client";

import { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, AlertCircle, FileText, CheckCheck, Trophy, RefreshCw, CheckCircle2 } from "lucide-react";
import { formatDateTime } from "@/lib/utils";

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
}

const TYPE_LABELS: Record<string, { label: string; icon: typeof Bell; color: string; bg: string }> = {
  NEW_TENDER: { label: "Новый тендер", icon: FileText, color: "text-blue-600", bg: "bg-blue-50" },
  DEADLINE_APPROACHING: { label: "Дедлайн", icon: AlertCircle, color: "text-red-600", bg: "bg-red-50" },
  STATUS_CHANGED: { label: "Статус", icon: CheckCheck, color: "text-green-600", bg: "bg-green-50" },
  PAYMENT_RECEIVED: { label: "Оплата", icon: Trophy, color: "text-amber-600", bg: "bg-amber-50" },
  SYSTEM: { label: "Система", icon: Bell, color: "text-gray-500", bg: "bg-gray-50" },
};

const FILTER_TYPES = ["all", "NEW_TENDER", "DEADLINE_APPROACHING", "STATUS_CHANGED", "PAYMENT_RECEIVED", "SYSTEM"] as const;

export default function NotificationsPage() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  const fetchItems = useCallback(async () => {
    const res = await fetch("/api/notifications");
    if (res.ok) {
      const data = await res.json();
      setItems(data.items);
      setUnreadCount(data.unreadCount);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  async function markAllRead() {
    await fetch("/api/notifications", { method: "POST" });
    setUnreadCount(0);
    setItems((prev) => prev.map((i) => ({ ...i, isRead: true })));
  }

  const filtered = filter === "all" ? items : items.filter((n) => n.type === filter);

  return (
    <div>
      <Header
        title="Уведомления"
        subtitle={unreadCount > 0 ? `${unreadCount} непрочитанных` : "Все прочитано"}
        actions={
          unreadCount > 0 ? (
            <Button size="sm" variant="outline" onClick={markAllRead}>
              <CheckCircle2 className="h-4 w-4 mr-1.5" />
              Прочитать все
            </Button>
          ) : undefined
        }
      />

      <div className="p-6 max-w-3xl space-y-4">
        {/* Filter tabs */}
        <div className="flex gap-2 flex-wrap">
          {FILTER_TYPES.map((t) => {
            const info = t === "all" ? null : TYPE_LABELS[t];
            const count = t === "all" ? items.length : items.filter((n) => n.type === t).length;
            return (
              <button
                key={t}
                onClick={() => setFilter(t)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-1.5 ${
                  filter === t
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {info?.label ?? "Все"}
                <span className={`text-[11px] px-1.5 py-0.5 rounded-full ${filter === t ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-500"}`}>
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
              <p className="text-gray-400 text-sm">Уведомлений нет</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0 divide-y divide-gray-50">
              {filtered.map((n) => {
                const info = TYPE_LABELS[n.type] ?? TYPE_LABELS.SYSTEM;
                const Icon = info.icon;
                return (
                  <div
                    key={n.id}
                    className={`flex items-start gap-4 px-5 py-4 hover:bg-gray-50/60 transition-colors ${
                      !n.isRead ? "bg-blue-50/30 border-l-2 border-l-blue-400" : ""
                    }`}
                  >
                    <div className={`p-2 rounded-lg shrink-0 ${info.bg}`}>
                      <Icon className={`h-4 w-4 ${info.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm leading-snug ${!n.isRead ? "font-semibold text-gray-900" : "text-gray-800"}`}>
                          {n.title}
                        </p>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant="secondary" className="text-[10px] py-0">
                            {info.label}
                          </Badge>
                          {!n.isRead && <span className="w-2 h-2 bg-blue-500 rounded-full" />}
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{n.body}</p>
                      <p className="text-[11px] text-gray-400 mt-1">{formatDateTime(n.createdAt)}</p>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
