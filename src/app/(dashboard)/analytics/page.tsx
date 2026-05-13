"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { PIPE_STAGE_LABELS, PIPE_STAGE_COLORS } from "@/types";
import type { PipeStage } from "@/types";
import { RefreshCw } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from "recharts";

interface AnalyticsData {
  pipelineDistribution: Array<{ stage: string; _count: number }>;
  monthlyData: Array<{
    month: string;
    label: string;
    count: number;
    won: number;
    amount: number;
    winRate: number;
  }>;
  topCustomers: Array<{ name: string; count: number; amount: number }>;
}

const PIE_COLORS = [
  "#3b82f6", "#f59e0b", "#8b5cf6", "#f97316",
  "#22c55e", "#ef4444", "#14b8a6", "#06b6d4",
];

function CustomTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm">
      {label && <p className="font-medium text-gray-700 mb-1">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>
          {p.name}: {p.name.includes("₸") || p.name === "Сумма" ? formatCurrency(p.value) : p.value}
          {p.name === "Конверсия" ? "%" : ""}
        </p>
      ))}
    </div>
  );
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/analytics")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div>
        <Header title="Аналитика" />
        <div className="p-6 flex items-center gap-2 text-gray-400 text-sm">
          <RefreshCw className="h-4 w-4 animate-spin" /> Загрузка...
        </div>
      </div>
    );
  }

  const pipeData = (data?.pipelineDistribution ?? []).map((p) => ({
    name: PIPE_STAGE_LABELS[p.stage as PipeStage] ?? p.stage,
    value: p._count,
  }));

  const totalLots = pipeData.reduce((s, p) => s + p.value, 0);
  const wonCount = data?.pipelineDistribution.find((p) => p.stage === "WON")?._count ?? 0;
  const lostCount = data?.pipelineDistribution.find((p) => p.stage === "LOST")?._count ?? 0;
  const totalFinished = wonCount + lostCount;
  const winRate = totalFinished > 0 ? Math.round((wonCount / totalFinished) * 100) : 0;

  return (
    <div>
      <Header title="Аналитика" subtitle="Статистика по воронке и тендерам" />

      <div className="p-6 space-y-6">
        {/* KPI row */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "Всего в воронке", value: totalLots },
            { label: "Выиграно", value: wonCount },
            { label: "Проиграно", value: lostCount },
            { label: "Конверсия", value: `${winRate}%` },
          ].map((kpi) => (
            <Card key={kpi.label}>
              <CardContent className="p-5 text-center">
                <div className="text-3xl font-bold text-gray-900">{kpi.value}</div>
                <div className="text-sm text-gray-500 mt-1">{kpi.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* Pipeline distribution pie */}
          <Card>
            <CardHeader>
              <CardTitle>Распределение по стадиям</CardTitle>
            </CardHeader>
            <CardContent>
              {pipeData.length === 0 ? (
                <div className="text-center py-10 text-gray-400 text-sm">
                  Нет данных. Добавьте тендеры в воронку.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={pipeData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={95}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {pipeData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                      formatter={(value, entry) => (
                        <span className="text-xs text-gray-600">
                          {value} ({(entry as { payload?: { value: number } }).payload?.value ?? 0})
                        </span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Monthly activity */}
          <Card>
            <CardHeader>
              <CardTitle>Активность по месяцам</CardTitle>
            </CardHeader>
            <CardContent>
              {!data?.monthlyData.length ? (
                <div className="text-center py-10 text-gray-400 text-sm">Нет данных за последние 6 месяцев</div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={data.monthlyData} barSize={28}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="count" name="Переходов" fill="#93c5fd" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="won" name="Выиграно" fill="#22c55e" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Win rate trend */}
        {(data?.monthlyData.length ?? 0) > 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Динамика конверсии (%)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={data!.monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} unit="%" />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="winRate"
                    name="Конверсия"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Top customers */}
        <Card>
          <CardHeader>
            <CardTitle>Топ заказчиков по количеству тендеров</CardTitle>
          </CardHeader>
          <CardContent>
            {!data?.topCustomers.length ? (
              <div className="text-center py-6 text-gray-400 text-sm">Нет данных</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={data.topCustomers}
                  layout="vertical"
                  barSize={18}
                  margin={{ left: 20, right: 30 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={180}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" name="Тендеров" fill="#6366f1" radius={[0, 3, 3, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
