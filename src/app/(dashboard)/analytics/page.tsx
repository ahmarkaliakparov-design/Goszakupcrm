"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { PIPE_STAGE_LABELS, PIPE_STAGE_COLORS } from "@/types";
import type { PipeStage } from "@/types";
import { RefreshCw, TrendingUp, Target, BarChart2 } from "lucide-react";
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
  ScatterChart,
  Scatter,
  ZAxis,
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

interface KtruRow {
  ktru: string;
  name: string;
  count: number;
  wins: number;
  winRate: number;
  avgBid: number;
  avgMargin: number | null;
  avgWinMargin: number | null;
  avgLossMargin: number | null;
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
          {p.name === "Конверсия" || p.name.includes("Маржа") ? "%" : ""}
        </p>
      ))}
    </div>
  );
}

type Tab = "pipeline" | "ktru";

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [ktruData, setKtruData] = useState<KtruRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("pipeline");

  useEffect(() => {
    Promise.all([
      fetch("/api/analytics").then((r) => r.json()),
      fetch("/api/analytics/ktru").then((r) => r.json()),
    ])
      .then(([a, k]) => {
        setData(a);
        setKtruData(Array.isArray(k) ? k : []);
        setLoading(false);
      })
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

        {/* Tabs */}
        <div className="flex gap-1 border-b border-gray-200">
          {([
            { id: "pipeline" as const, label: "Воронка", icon: BarChart2 },
            { id: "ktru" as const, label: "KTRU Аналитика", icon: Target },
          ] as const).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                tab === id
                  ? "border-blue-600 text-blue-700"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        {tab === "pipeline" && (
          <div className="space-y-6">
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
        )}

        {tab === "ktru" && (
          <div className="space-y-6">
            {ktruData.length === 0 ? (
              <Card>
                <CardContent className="py-16 text-center text-gray-400 text-sm">
                  <Target className="h-10 w-10 text-gray-200 mx-auto mb-3" />
                  Нет данных по KTRU. Создайте расчёты стоимости с KTRU-кодами.
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Win rate bar chart */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-green-500" />
                      Процент выигрышей по KTRU категориям
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={Math.max(200, ktruData.length * 36)}>
                      <BarChart
                        data={ktruData}
                        layout="vertical"
                        barSize={20}
                        margin={{ left: 10, right: 60 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                        <XAxis type="number" domain={[0, 100]} unit="%" tick={{ fontSize: 12 }} />
                        <YAxis
                          type="category"
                          dataKey="name"
                          width={200}
                          tick={{ fontSize: 11 }}
                        />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (!active || !payload?.length) return null;
                            const d = payload[0].payload as KtruRow;
                            return (
                              <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm max-w-xs">
                                <p className="font-medium text-gray-800 mb-2">{d.name}</p>
                                <p className="text-xs text-gray-400 mb-2">{d.ktru}</p>
                                <div className="space-y-1 text-xs">
                                  <p>Расчётов: <span className="font-medium">{d.count}</span></p>
                                  <p>Выигрышей: <span className="font-medium text-green-600">{d.wins}</span></p>
                                  <p>Win rate: <span className="font-medium text-blue-600">{d.winRate}%</span></p>
                                  {d.avgMargin !== null && (
                                    <p>Средняя маржа: <span className="font-medium">{d.avgMargin.toFixed(1)}%</span></p>
                                  )}
                                  {d.avgWinMargin !== null && (
                                    <p className="text-green-600">Маржа побед: <span className="font-medium">{d.avgWinMargin.toFixed(1)}%</span></p>
                                  )}
                                  {d.avgLossMargin !== null && (
                                    <p className="text-red-500">Маржа поражений: <span className="font-medium">{d.avgLossMargin.toFixed(1)}%</span></p>
                                  )}
                                </div>
                              </div>
                            );
                          }}
                        />
                        <Bar dataKey="winRate" name="Win rate %" fill="#22c55e" radius={[0, 4, 4, 0]}>
                          {ktruData.map((row, i) => (
                            <Cell
                              key={i}
                              fill={row.winRate >= 60 ? "#22c55e" : row.winRate >= 30 ? "#f59e0b" : "#ef4444"}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Margin comparison: wins vs losses */}
                <Card>
                  <CardHeader>
                    <CardTitle>Оптимальная маржа: победы vs поражения</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wide">
                            <th className="text-left py-2 pr-4">Категория (KTRU)</th>
                            <th className="text-right py-2 px-3">Расчётов</th>
                            <th className="text-right py-2 px-3">Win rate</th>
                            <th className="text-right py-2 px-3">Маржа побед</th>
                            <th className="text-right py-2 px-3">Маржа поражений</th>
                            <th className="text-right py-2 px-3">Рекомендация</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {ktruData.map((row) => {
                            const recommended = row.avgWinMargin !== null
                              ? row.avgWinMargin
                              : row.avgMargin;
                            const winRateColor = row.winRate >= 60 ? "text-green-600" : row.winRate >= 30 ? "text-amber-600" : "text-red-500";
                            return (
                              <tr key={row.ktru} className="hover:bg-gray-50">
                                <td className="py-3 pr-4">
                                  <div className="font-medium text-gray-900 text-xs leading-snug">{row.name}</div>
                                  <div className="text-[10px] text-gray-400 font-mono mt-0.5">{row.ktru}</div>
                                </td>
                                <td className="text-right py-3 px-3 text-gray-600">{row.count}</td>
                                <td className={`text-right py-3 px-3 font-semibold ${winRateColor}`}>{row.winRate}%</td>
                                <td className="text-right py-3 px-3 text-green-600 font-medium">
                                  {row.avgWinMargin !== null ? `${row.avgWinMargin.toFixed(1)}%` : "—"}
                                </td>
                                <td className="text-right py-3 px-3 text-red-500">
                                  {row.avgLossMargin !== null ? `${row.avgLossMargin.toFixed(1)}%` : "—"}
                                </td>
                                <td className="text-right py-3 px-3">
                                  {recommended !== null ? (
                                    <span className="inline-block bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-semibold text-xs">
                                      {recommended.toFixed(1)}%
                                    </span>
                                  ) : "—"}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <p className="text-xs text-gray-400 mt-3">
                      * Рекомендуемая маржа рассчитана на основе ваших выигранных тендеров в данной категории
                    </p>
                  </CardContent>
                </Card>

                {/* Scatter: margin vs win rate */}
                {ktruData.filter((r) => r.avgMargin !== null).length >= 3 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Маржа vs Win rate — «сладкое пятно»</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={260}>
                        <ScatterChart margin={{ top: 10, right: 30, bottom: 10, left: 10 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis
                            type="number"
                            dataKey="avgMargin"
                            name="Маржа"
                            unit="%"
                            tick={{ fontSize: 11 }}
                            label={{ value: "Средняя маржа %", position: "insideBottom", offset: -5, fontSize: 11 }}
                          />
                          <YAxis
                            type="number"
                            dataKey="winRate"
                            name="Win rate"
                            unit="%"
                            tick={{ fontSize: 11 }}
                            label={{ value: "Win rate %", angle: -90, position: "insideLeft", fontSize: 11 }}
                          />
                          <ZAxis type="number" dataKey="count" range={[60, 400]} />
                          <Tooltip
                            content={({ active, payload }) => {
                              if (!active || !payload?.length) return null;
                              const d = payload[0].payload as KtruRow;
                              return (
                                <div className="bg-white border border-gray-200 rounded-lg shadow p-2 text-xs">
                                  <p className="font-medium">{d.name}</p>
                                  <p>Маржа: {d.avgMargin?.toFixed(1)}% | Win: {d.winRate}%</p>
                                </div>
                              );
                            }}
                          />
                          <Scatter
                            data={ktruData.filter((r) => r.avgMargin !== null)}
                            fill="#3b82f6"
                            fillOpacity={0.7}
                          />
                        </ScatterChart>
                      </ResponsiveContainer>
                      <p className="text-xs text-gray-400 mt-2 text-center">
                        Размер точки = количество расчётов. Правый верхний угол — оптимальные категории.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
