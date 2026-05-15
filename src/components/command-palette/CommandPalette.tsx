"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  Search, FileText, Kanban, Truck, Building2, LayoutDashboard, BarChart2,
  Settings, Sword, Plus, LogOut, ArrowRight, Command,
} from "lucide-react";

interface SearchResult {
  type: "tender" | "lot" | "supplier" | "customer" | "competitor";
  id: string;
  title: string;
  subtitle: string;
  href: string;
}

const NAV_COMMANDS: Array<{ id: string; title: string; icon: typeof FileText; href?: string; action?: () => void; keywords: string }> = [
  { id: "nav-dashboard", title: "Перейти: Дашборд", icon: LayoutDashboard, href: "/dashboard", keywords: "dashboard главная" },
  { id: "nav-tenders", title: "Перейти: Тендеры", icon: FileText, href: "/tenders", keywords: "tenders тендеры" },
  { id: "nav-pipeline", title: "Перейти: Воронка", icon: Kanban, href: "/pipeline", keywords: "pipeline воронка канбан" },
  { id: "nav-suppliers", title: "Перейти: Поставщики", icon: Truck, href: "/suppliers", keywords: "suppliers поставщики" },
  { id: "nav-customers", title: "Перейти: Заказчики", icon: Building2, href: "/customers", keywords: "customers заказчики" },
  { id: "nav-competitors", title: "Перейти: Конкуренты", icon: Sword, href: "/competitors", keywords: "competitors конкуренты" },
  { id: "nav-analytics", title: "Перейти: Аналитика", icon: BarChart2, href: "/analytics", keywords: "analytics аналитика" },
  { id: "nav-settings", title: "Перейти: Настройки", icon: Settings, href: "/settings", keywords: "settings настройки" },
];

const ACTION_COMMANDS: Array<{ id: string; title: string; icon: typeof Plus; action: (router: ReturnType<typeof useRouter>) => void; keywords: string }> = [
  {
    id: "act-new-tender",
    title: "Действие: Добавить тендер",
    icon: Plus,
    action: (r) => r.push("/tenders?new=1"),
    keywords: "new tender создать тендер",
  },
  {
    id: "act-logout",
    title: "Действие: Выйти",
    icon: LogOut,
    action: () => signOut({ callbackUrl: "/login" }),
    keywords: "logout signout выйти выход",
  },
];

const typeLabels: Record<SearchResult["type"], { label: string; icon: typeof FileText; color: string }> = {
  tender: { label: "Тендер", icon: FileText, color: "text-blue-500" },
  lot: { label: "Лот", icon: Kanban, color: "text-purple-500" },
  supplier: { label: "Поставщик", icon: Truck, color: "text-green-500" },
  customer: { label: "Заказчик", icon: Building2, color: "text-amber-500" },
  competitor: { label: "Конкурент", icon: Sword, color: "text-red-500" },
};

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setResults([]);
      setActiveIdx(0);
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [open]);

  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data.results ?? []);
          setActiveIdx(0);
        }
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => clearTimeout(t);
  }, [query]);

  const q = query.toLowerCase().trim();
  const filteredNav = q.length === 0
    ? NAV_COMMANDS
    : NAV_COMMANDS.filter((c) => c.title.toLowerCase().includes(q) || c.keywords.toLowerCase().includes(q));
  const filteredActions = q.length === 0
    ? ACTION_COMMANDS
    : ACTION_COMMANDS.filter((c) => c.title.toLowerCase().includes(q) || c.keywords.toLowerCase().includes(q));

  const allItems: Array<{ kind: "nav"; data: typeof NAV_COMMANDS[number] } | { kind: "action"; data: typeof ACTION_COMMANDS[number] } | { kind: "search"; data: SearchResult }> = [
    ...filteredNav.map((data) => ({ kind: "nav" as const, data })),
    ...filteredActions.map((data) => ({ kind: "action" as const, data })),
    ...results.map((data) => ({ kind: "search" as const, data })),
  ];

  const execute = useCallback((item: typeof allItems[number]) => {
    setOpen(false);
    if (item.kind === "nav") {
      if (item.data.href) router.push(item.data.href);
    } else if (item.kind === "action") {
      item.data.action(router);
    } else {
      router.push(item.data.href);
    }
  }, [router]);

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(allItems.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = allItems[activeIdx];
      if (item) execute(item);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] bg-black/40 backdrop-blur-sm"
      onClick={() => setOpen(false)}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden border border-gray-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
          <Search className="h-4 w-4 text-gray-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Поиск тендеров, лотов, поставщиков или команды..."
            className="flex-1 text-sm bg-transparent outline-none placeholder:text-gray-400"
          />
          <kbd className="hidden md:inline-flex items-center gap-1 text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
            <Command className="h-3 w-3" />K
          </kbd>
        </div>

        <div className="max-h-[60vh] overflow-y-auto">
          {loading && (
            <div className="px-4 py-3 text-xs text-gray-400">Поиск...</div>
          )}

          {!loading && allItems.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-gray-400">
              {query.length < 2 ? "Введите запрос или используйте навигацию" : "Ничего не найдено"}
            </div>
          )}

          {filteredNav.length > 0 && (
            <div>
              <div className="px-4 py-1.5 text-[10px] uppercase tracking-wider text-gray-400 bg-gray-50 font-semibold">Навигация</div>
              {filteredNav.map((cmd, i) => {
                const idx = i;
                const Icon = cmd.icon;
                return (
                  <button
                    key={cmd.id}
                    onMouseEnter={() => setActiveIdx(idx)}
                    onClick={() => execute({ kind: "nav", data: cmd })}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors ${
                      activeIdx === idx ? "bg-blue-50 text-blue-900" : "hover:bg-gray-50"
                    }`}
                  >
                    <Icon className="h-4 w-4 text-gray-400" />
                    <span className="flex-1">{cmd.title.replace("Перейти: ", "")}</span>
                    {activeIdx === idx && <ArrowRight className="h-3.5 w-3.5 text-blue-400" />}
                  </button>
                );
              })}
            </div>
          )}

          {filteredActions.length > 0 && (
            <div>
              <div className="px-4 py-1.5 text-[10px] uppercase tracking-wider text-gray-400 bg-gray-50 font-semibold">Действия</div>
              {filteredActions.map((cmd, i) => {
                const idx = filteredNav.length + i;
                const Icon = cmd.icon;
                return (
                  <button
                    key={cmd.id}
                    onMouseEnter={() => setActiveIdx(idx)}
                    onClick={() => execute({ kind: "action", data: cmd })}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors ${
                      activeIdx === idx ? "bg-blue-50 text-blue-900" : "hover:bg-gray-50"
                    }`}
                  >
                    <Icon className="h-4 w-4 text-gray-400" />
                    <span className="flex-1">{cmd.title.replace("Действие: ", "")}</span>
                  </button>
                );
              })}
            </div>
          )}

          {results.length > 0 && (
            <div>
              <div className="px-4 py-1.5 text-[10px] uppercase tracking-wider text-gray-400 bg-gray-50 font-semibold">Результаты поиска</div>
              {results.map((r, i) => {
                const idx = filteredNav.length + filteredActions.length + i;
                const t = typeLabels[r.type];
                const Icon = t.icon;
                return (
                  <button
                    key={`${r.type}-${r.id}`}
                    onMouseEnter={() => setActiveIdx(idx)}
                    onClick={() => execute({ kind: "search", data: r })}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors ${
                      activeIdx === idx ? "bg-blue-50 text-blue-900" : "hover:bg-gray-50"
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${t.color}`} />
                    <div className="flex-1 min-w-0">
                      <div className="truncate font-medium">{r.title}</div>
                      <div className="truncate text-xs text-gray-500">{r.subtitle}</div>
                    </div>
                    <span className="text-[10px] uppercase tracking-wider text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                      {t.label}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="border-t border-gray-100 px-4 py-2 text-[10px] text-gray-400 flex items-center gap-4">
          <span className="flex items-center gap-1"><kbd className="bg-gray-100 px-1 rounded">↑↓</kbd> навигация</span>
          <span className="flex items-center gap-1"><kbd className="bg-gray-100 px-1 rounded">↵</kbd> выбрать</span>
          <span className="flex items-center gap-1"><kbd className="bg-gray-100 px-1 rounded">esc</kbd> закрыть</span>
        </div>
      </div>
    </div>
  );
}
