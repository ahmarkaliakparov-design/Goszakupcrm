import { auth } from "@/lib/auth";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import {
  FileText,
  Kanban,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowUpRight,
} from "lucide-react";

// Тестовые данные — заменить на реальные запросы из БД после подключения
const stats = [
  {
    label: "Активных тендеров",
    value: "24",
    delta: "+8 за неделю",
    positive: true,
    icon: FileText,
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  {
    label: "В воронке",
    value: "11",
    delta: "3 на расчёте",
    positive: true,
    icon: Kanban,
    color: "text-purple-600",
    bg: "bg-purple-50",
  },
  {
    label: "Выиграно (месяц)",
    value: "3",
    delta: formatCurrency(47500000),
    positive: true,
    icon: TrendingUp,
    color: "text-green-600",
    bg: "bg-green-50",
  },
  {
    label: "Дедлайн сегодня",
    value: "2",
    delta: "Требуют внимания",
    positive: false,
    icon: Clock,
    color: "text-red-600",
    bg: "bg-red-50",
  },
];

const recentTenders = [
  {
    id: "1",
    name: "Поставка офисной мебели для МИО г. Алматы",
    customer: "Управление образования г. Алматы",
    amount: 8750000,
    deadline: "15.05.2026",
    stage: "ANALYSIS" as const,
    daysLeft: 3,
  },
  {
    id: "2",
    name: "Закупка компьютерного оборудования для школ",
    customer: "Управление образования Алматинской обл.",
    amount: 34200000,
    deadline: "20.05.2026",
    stage: "CALCULATION" as const,
    daysLeft: 8,
  },
  {
    id: "3",
    name: "Канцелярские товары для акимата",
    customer: "Акимат г. Нур-Султан",
    amount: 1850000,
    deadline: "18.05.2026",
    stage: "SUBMITTED" as const,
    daysLeft: 6,
  },
  {
    id: "4",
    name: "Поставка строительных материалов",
    customer: "ГУ Комитет по строительству",
    amount: 56000000,
    deadline: "25.05.2026",
    stage: "FOUND" as const,
    daysLeft: 13,
  },
  {
    id: "5",
    name: "Медицинское оборудование для ЦРБ",
    customer: "ГКП Центральная районная больница",
    amount: 12400000,
    deadline: "12.05.2026",
    stage: "WON" as const,
    daysLeft: 0,
  },
];

const stageLabels: Record<string, string> = {
  FOUND: "Найден",
  ANALYSIS: "Анализ",
  CALCULATION: "Расчёт",
  SUBMITTED: "Подан",
  WON: "Выиграл",
  LOST: "Проиграл",
};

const stageBadgeVariants: Record<string, "default" | "secondary" | "success" | "warning" | "destructive"> = {
  FOUND: "secondary",
  ANALYSIS: "warning",
  CALCULATION: "default",
  SUBMITTED: "default",
  WON: "success",
  LOST: "destructive",
};

const pipelineStages = [
  { key: "FOUND", label: "Найден", count: 5 },
  { key: "ANALYSIS", label: "Анализ", count: 3 },
  { key: "CALCULATION", label: "Расчёт", count: 2 },
  { key: "SUBMITTED", label: "Подан", count: 4 },
  { key: "WON", label: "Выиграл", count: 3 },
  { key: "LOST", label: "Проиграл", count: 7 },
];

export default async function DashboardPage() {
  const session = await auth();

  return (
    <div>
      <Header
        title="Дашборд"
        subtitle={`Добрый день, ${session?.user?.name?.split(" ")[0] ?? ""}!`}
      />

      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.label}>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className={`${stat.bg} rounded-lg p-2`}>
                      <Icon className={`h-5 w-5 ${stat.color}`} />
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                  <div className="text-sm text-gray-500 mt-0.5">{stat.label}</div>
                  <div className={`text-xs mt-1 ${stat.positive ? "text-green-600" : "text-red-600"}`}>
                    {stat.delta}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent tenders */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Активные лоты</span>
                  <a href="/tenders" className="text-sm text-blue-600 hover:underline flex items-center gap-1 font-normal">
                    Все тендеры <ArrowUpRight className="h-3.5 w-3.5" />
                  </a>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-gray-100">
                  {recentTenders.map((tender) => (
                    <div key={tender.id} className="px-5 py-3.5 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900 truncate">{tender.name}</p>
                          <p className="text-xs text-gray-500 mt-0.5 truncate">{tender.customer}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant={stageBadgeVariants[tender.stage]}>
                            {stageLabels[tender.stage]}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 mt-1.5">
                        <span className="text-sm font-semibold text-gray-900">
                          {formatCurrency(tender.amount)}
                        </span>
                        <span className={`text-xs flex items-center gap-1 ${tender.daysLeft <= 3 ? "text-red-600" : "text-gray-400"}`}>
                          <Clock className="h-3 w-3" />
                          {tender.deadline}
                          {tender.daysLeft > 0 && ` (${tender.daysLeft} дн.)`}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Pipeline summary */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Воронка</span>
                  <a href="/pipeline" className="text-sm text-blue-600 hover:underline flex items-center gap-1 font-normal">
                    Открыть <ArrowUpRight className="h-3.5 w-3.5" />
                  </a>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2.5">
                  {pipelineStages.map((stage) => (
                    <div key={stage.key} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">{stage.label}</span>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-20 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded-full"
                            style={{ width: `${(stage.count / 10) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-gray-900 w-4 text-right">{stage.count}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Конверсия</span>
                    <span className="font-medium text-green-600">
                      <CheckCircle2 className="h-3.5 w-3.5 inline mr-1" />
                      30%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Alerts */}
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-500" />
                  Требуют внимания
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-sm text-gray-700 bg-amber-50 rounded-md p-3 border border-amber-200">
                  Дедлайн подачи через 1 день: <span className="font-medium">Канцтовары для акимата</span>
                </div>
                <div className="text-sm text-gray-700 bg-red-50 rounded-md p-3 border border-red-200">
                  Сегодня дедлайн: <span className="font-medium">Медоборудование для ЦРБ</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
