"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Kanban,
  Truck,
  Building2,
  Settings,
  LogOut,
  BarChart2,
  ChevronLeft,
  ChevronRight,
  Sword,
  Search,
  Command,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { signOut } from "next-auth/react";
import { useState } from "react";

const navItems = [
  { href: "/dashboard", label: "Дашборд", icon: LayoutDashboard },
  { href: "/tenders", label: "Тендеры", icon: FileText },
  { href: "/pipeline", label: "Воронка", icon: Kanban },
  { href: "/suppliers", label: "Поставщики", icon: Truck },
  { href: "/customers", label: "Заказчики", icon: Building2 },
  { href: "/competitors", label: "Конкуренты", icon: Sword },
  { href: "/analytics", label: "Аналитика", icon: BarChart2 },
];

function openCommandPalette() {
  window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }));
}

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "flex flex-col bg-gray-900 text-white transition-all duration-200 min-h-screen",
        collapsed ? "w-16" : "w-60",
      )}
    >
      {/* Logo */}
      <div className={cn("flex items-center gap-3 px-4 py-5 border-b border-gray-700", collapsed && "justify-center")}>
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
          T
        </div>
        {!collapsed && (
          <span className="font-semibold text-white text-sm">Tender CRM</span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 space-y-1 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-blue-600 text-white"
                  : "text-gray-400 hover:bg-gray-800 hover:text-white",
                collapsed && "justify-center px-2",
              )}
              title={collapsed ? item.label : undefined}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="border-t border-gray-700 p-2 space-y-1">
        <button
          onClick={openCommandPalette}
          className={cn(
            "w-full flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-white transition-colors",
            collapsed && "justify-center px-2",
          )}
          title={collapsed ? "Поиск (⌘K)" : undefined}
        >
          <Search className="h-5 w-5 shrink-0" />
          {!collapsed && (
            <span className="flex-1 text-left flex items-center justify-between">
              Поиск
              <kbd className="text-[10px] bg-gray-800 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                <Command className="h-2.5 w-2.5" />K
              </kbd>
            </span>
          )}
        </button>

        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-white transition-colors",
            collapsed && "justify-center px-2",
          )}
          title={collapsed ? "Настройки" : undefined}
        >
          <Settings className="h-5 w-5 shrink-0" />
          {!collapsed && <span>Настройки</span>}
        </Link>

        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className={cn(
            "w-full flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-white transition-colors",
            collapsed && "justify-center px-2",
          )}
          title={collapsed ? "Выйти" : undefined}
        >
          <LogOut className="h-5 w-5 shrink-0" />
          {!collapsed && <span>Выйти</span>}
        </button>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "w-full flex items-center gap-3 rounded-md px-3 py-2 text-xs text-gray-600 hover:text-gray-400 transition-colors",
            collapsed && "justify-center px-2",
          )}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          {!collapsed && <span>Свернуть</span>}
        </button>
      </div>
    </aside>
  );
}
