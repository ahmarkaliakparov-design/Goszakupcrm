import { auth } from "@/lib/auth";
import { getCompanyId } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate, daysUntil } from "@/lib/utils";
import { PIPE_STAGE_LABELS } from "@/types";
import type { PipeStage } from "@/types";
import { FileText, Kanban, TrendingUp, Clock, CheckCircle2, AlertCircle, ArrowUpRight, CheckSquare, Circle } from "lucide-react";
import Link from "next/link";

async function getDashboardData(companyId: string) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const oneWeekAhead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [totalTenders, newThisWeek, pipelineCounts, wonThisMonth, deadlineSoon, recentPipeline, openTasks] = await Promise.all([
    prisma.tender.count({ where: { companyId } }),
    prisma.tender.count({ where: { companyId, createdAt: { gte: weekAgo } } }),
    prisma.lotPipeline.groupBy({
      by: ["stage"],
      where: { companyId, isArchived: false },
      _count: true,
    }),
    prisma.lotPipeline.findMany({
      where: { companyId, stage: "WON", wonAt: { gte: startOfMonth } },
      include: { lot: { select: { totalPrice: true } } },
    }),
    prisma.lotPipeline.findMany({
      where: {
        companyId, isArchived: false,
        stage: { notIn: ["WON", "LOST", "CLOSED"] },
        lot: { tender: { deadline: { gte: today, lte: new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000) } } },
      },
      include: { lot: { include: { tender: { select: { name: true, deadline: true } } } } },
    }),
    prisma.lotPipeline.findMany({
      where: { companyId, isArchived: false },
      include: { lot: { include: { tender: { select: { name: true, customerName: true, deadline: true } } } } },
      orderBy: { updatedAt: "desc" },
      take: 7,
    }),
    prisma.lotTask.findMany({
      where: {
        pipeline: { companyId },
        done: false,
        OR: [
          { dueDate: { lte: oneWeekAhead } },
          { dueDate: null },
        ],
      },
      include: { pipeline: { include: { lot: { select: { id: true, name: true } } } } },
      orderBy: [{ dueDate: { sort: "asc", nulls: "last" } }],
      take: 8,
    }),
  ]);

  const wonTotal = wonThisMonth.reduce((s, p) => s + (p.lot.totalPrice ? Number(p.lot.totalPrice) : 0), 0);
  const pipelineMap = Object.fromEntries(pipelineCounts.map((p) => [p.stage, p._count]));
  const totalInPipeline = Object.values(pipelineMap).reduce((a, b) => a + b, 0);

  return JSON.parse(JSON.stringify({
    totalTenders, newThisWeek, totalInPipeline,
    wonThisMonth: wonThisMonth.length, wonTotal,
    pipelineMap, deadlineSoon, recentPipeline, openTasks,
  }));
}

export default async function DashboardPage() {
  const session = await auth();
  const companyId = await getCompanyId();
  const data = await getDashboardData(companyId);

  const firstName = session?.user?.name?.split(" ")[0] ?? "";

  const stats = [
    {
      label: "Тендеров всего",
      value: data.totalTenders,
      delta: data.newThisWeek > 0 ? `+${data.newThisWeek} за неделю` : "Нет новых",
      positive: data.newThisWeek > 0,
      icon: FileText,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "В воронке",
      value: data.totalInPipeline,
      delta: `${data.pipelineMap["CALCULATION"] ?? 0} на расчёте`,
      positive: true,
      icon: Kanban,
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
    {
      label: "Выиграно (месяц)",
      value: data.wonThisMonth,
      delta: data.wonTotal > 0 ? formatCurrency(data.wonTotal) : "Нет побед",
      positive: data.wonThisMonth > 0,
      icon: TrendingUp,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      label: "Дедлайн ≤ 3 дней",
      value: data.deadlineSoon.length,
      delta: data.deadlineSoon.length > 0 ? "Требуют внимания!" : "Всё в порядке",
      positive: data.deadlineSoon.length === 0,
      icon: Clock,
      color: data.deadlineSoon.length > 0 ? "text-red-600" : "text-green-600",
      bg: data.deadlineSoon.length > 0 ? "bg-red-50" : "bg-green-50",
    },
  ];

  const STAGE_ORDER: PipeStage[] = ["FOUND", "ANALYSIS", "CALCULATION", "SUBMITTED", "WON", "LOST"];

  return (
    <div>
      <Header
        title="Дашборд"
        subtitle={`Добрый день${firstName ? `, ${firstName}` : ""}!`}
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
          {/* Recent pipeline */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Активные лоты</span>
                  <Link href="/pipeline" className="text-sm text-blue-600 hover:underline flex items-center gap-1 font-normal">
                    Воронка <ArrowUpRight className="h-3.5 w-3.5" />
                  </Link>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {data.recentPipeline.length === 0 ? (
                  <div className="px-5 py-8 text-center">
                    <p className="text-sm text-gray-400">Воронка пуста</p>
                    <Link href="/tenders" className="text-sm text-blue-600 hover:underline mt-1 block">
                      Добавьте тендеры →
                    </Link>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {data.recentPipeline.map((p: {
                      id: string;
                      stage: PipeStage;
                      lot: {
                        id: string;
                        name: string;
                        totalPrice: string | null;
                        tender: { name: string; customerName: string | null; deadline: string | null };
                      };
                    }) => {
                      const days = daysUntil(p.lot.tender.deadline);
                      return (
                        <Link
                          key={p.id}
                          href={`/lots/${p.lot.id}`}
                          className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-900 truncate">{p.lot.name}</p>
                            <p className="text-xs text-gray-500 mt-0.5 truncate">{p.lot.tender.customerName ?? p.lot.tender.name}</p>
                          </div>
                          <div className="flex items-center gap-3 ml-3 shrink-0">
                            {p.lot.totalPrice && (
                              <span className="text-sm font-semibold text-gray-900">
                                {formatCurrency(parseFloat(p.lot.totalPrice))}
                              </span>
                            )}
                            <Badge variant="secondary">{PIPE_STAGE_LABELS[p.stage]}</Badge>
                            {p.lot.tender.deadline && (
                              <span className={`text-xs flex items-center gap-1 ${days !== null && days <= 3 ? "text-red-600" : "text-gray-400"}`}>
                                <Clock className="h-3 w-3" />
                                {formatDate(p.lot.tender.deadline)}
                              </span>
                            )}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Pipeline summary + alerts */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Воронка</span>
                  <Link href="/pipeline" className="text-sm text-blue-600 hover:underline flex items-center gap-1 font-normal">
                    Открыть <ArrowUpRight className="h-3.5 w-3.5" />
                  </Link>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2.5">
                  {STAGE_ORDER.map((stage) => {
                    const count = data.pipelineMap[stage] ?? 0;
                    const max = Math.max(...STAGE_ORDER.map((s) => data.pipelineMap[s] ?? 0), 1);
                    return (
                      <div key={stage} className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">{PIPE_STAGE_LABELS[stage]}</span>
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-20 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500 rounded-full transition-all"
                              style={{ width: `${(count / max) * 100}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium text-gray-900 w-4 text-right">{count}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {(data.pipelineMap["WON"] ?? 0) + (data.pipelineMap["LOST"] ?? 0) > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Конверсия</span>
                      <span className="font-medium text-green-600 flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {Math.round(
                          ((data.pipelineMap["WON"] ?? 0) /
                            ((data.pipelineMap["WON"] ?? 0) + (data.pipelineMap["LOST"] ?? 0))) * 100,
                        )}%
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {data.deadlineSoon.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-amber-700">
                    <AlertCircle className="h-4 w-4 text-amber-500" />
                    Срочные дедлайны
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {data.deadlineSoon.map((p: {
                    id: string;
                    lot: { id: string; name: string; tender: { name: string; deadline: string | null } };
                  }) => {
                    const days = daysUntil(p.lot.tender.deadline);
                    return (
                      <Link
                        key={p.id}
                        href={`/lots/${p.lot.id}`}
                        className={`block text-sm rounded-md p-3 border transition-colors hover:opacity-80 ${
                          days === 0 ? "bg-red-50 border-red-200 text-red-800" : "bg-amber-50 border-amber-200 text-amber-800"
                        }`}
                      >
                        <span className="font-medium">{days === 0 ? "Сегодня: " : `Через ${days} дн.: `}</span>
                        {p.lot.name}
                      </Link>
                    );
                  })}
                </CardContent>
              </Card>
            )}

            {data.openTasks?.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <CheckSquare className="h-4 w-4 text-blue-500" />
                    Задачи на неделю
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1.5">
                  {data.openTasks.map((task: {
                    id: string;
                    text: string;
                    dueDate: string | null;
                    pipeline: { lot: { id: string; name: string } };
                  }) => {
                    const days = task.dueDate ? daysUntil(task.dueDate) : null;
                    const overdue = days !== null && days < 0;
                    const today = days === 0;
                    return (
                      <Link
                        key={task.id}
                        href={`/lots/${task.pipeline.lot.id}`}
                        className="flex items-start gap-2 text-sm p-2 rounded hover:bg-gray-50 transition-colors"
                      >
                        <Circle className="h-3.5 w-3.5 text-gray-300 mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-gray-800 truncate text-xs">{task.text}</p>
                          <p className="text-[10px] text-blue-600 truncate mt-0.5">{task.pipeline.lot.name}</p>
                        </div>
                        {days !== null && (
                          <span className={`text-[10px] shrink-0 px-1.5 py-0.5 rounded ${
                            overdue ? "bg-red-100 text-red-700" :
                            today ? "bg-amber-100 text-amber-700" :
                            "bg-gray-100 text-gray-500"
                          }`}>
                            {overdue ? `просрочено` : today ? "сегодня" : `${days}д`}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
