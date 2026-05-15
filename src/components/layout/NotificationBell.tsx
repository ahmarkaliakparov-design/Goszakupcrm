"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Bell, AlertCircle, FileText, CheckCheck, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/utils";

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
}

const typeIcons: Record<string, { icon: typeof Bell; color: string }> = {
  NEW_TENDER: { icon: FileText, color: "text-blue-500" },
  DEADLINE_APPROACHING: { icon: AlertCircle, color: "text-red-500" },
  STATUS_CHANGED: { icon: CheckCheck, color: "text-green-500" },
  PAYMENT_RECEIVED: { icon: Trophy, color: "text-amber-500" },
  SYSTEM: { icon: Bell, color: "text-gray-500" },
};

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchItems = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setItems(data.items);
        setUnread(data.unreadCount);
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchItems();
    const interval = setInterval(fetchItems, 60_000); // poll every minute
    return () => clearInterval(interval);
  }, [fetchItems]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  async function markAllRead() {
    await fetch("/api/notifications", { method: "POST" });
    setUnread(0);
    setItems((prev) => prev.map((i) => ({ ...i, isRead: true })));
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        onClick={() => setOpen(!open)}
      >
        <Bell className="h-5 w-5 text-gray-500" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </Button>

      {open && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
            <h3 className="text-sm font-semibold text-gray-900">Уведомления</h3>
            {unread > 0 && (
              <button onClick={markAllRead} className="text-xs text-blue-600 hover:underline">
                Прочитать все
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <div className="py-8 text-center text-sm text-gray-400">
                <Bell className="h-8 w-8 text-gray-200 mx-auto mb-2" />
                Уведомлений нет
              </div>
            ) : (
              items.map((n) => {
                const typeInfo = typeIcons[n.type] ?? typeIcons.SYSTEM;
                const Icon = typeInfo.icon;
                return (
                  <div
                    key={n.id}
                    className={`flex items-start gap-3 px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors ${
                      !n.isRead ? "bg-blue-50/40" : ""
                    }`}
                  >
                    <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${typeInfo.color}`} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${!n.isRead ? "font-medium text-gray-900" : "text-gray-700"}`}>
                        {n.title}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.body}</p>
                      <p className="text-[11px] text-gray-400 mt-1">{formatDateTime(n.createdAt)}</p>
                    </div>
                    {!n.isRead && <span className="w-2 h-2 bg-blue-500 rounded-full shrink-0 mt-1.5" />}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
