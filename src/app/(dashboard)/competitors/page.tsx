"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { Sword, TrendingDown, Trophy, RefreshCw, Eye } from "lucide-react";

interface CompetitorWithStats {
  id: string;
  name: string;
  bin: string | null;
  encounters: number;
  wins: number;
  totalWinAmount: string | null;
  avgDiscount: string | null;
  notes: string | null;
  createdAt: string;
  lossRecords: Array<{
    id: string;
    createdAt: string;
    winningPrice: string | null;
    pipeline: { lot: { tender: { name: string; customerName: string | null } } };
  }>;
  _count: { lossRecords: number };
}

export default function CompetitorsPage() {
  const { toast } = useToast();
  const [competitors, setCompetitors] = useState<CompetitorWithStats[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCompetitors = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/competitors");
    if (res.ok) setCompetitors(await res.json());
    else toast("Ошибка загрузки", "error");
    setLoading(false);
  }, [toast]);

  useEffect(() => { fetchCompetitors(); }, [fetchCompetitors]);

  const totalLosses = competitors.reduce((s, c) => s + c.encounters, 0);
  const totalCaptured = competitors.reduce((s, c) => s + Number(c.totalWinAmount ?? 0), 0);
  const topThreat = competitors[0];

  return (
    <div>
      <Header
        title="Конкурент-радар"
        subtitle="База данных о тех, кто выигрывает вместо вас"
      />

      <div className="p-6 space-y-6">
        {/* KPI */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Конкурентов в базе</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{competitors.length}</p>
                </div>
                <div className="bg-red-50 rounded-lg p-3">
                  <Sword className="h-5 w-5 text-red-600" />
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-2">{totalLosses} проигранных тендеров</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Упущенная выручка</p>
                  <p className="text-3xl font-bold text-red-700 mt-1">{formatCurrency(totalCaptured)}</p>
                </div>
                <div className="bg-red-50 rounded-lg p-3">
                  <TrendingDown className="h-5 w-5 text-red-600" />
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-2">Деньги, ушедшие конкурентам</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between min-w-0">
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Главная угроза</p>
                  <p className="text-base font-semibold text-gray-900 mt-1 truncate">
                    {topThreat?.name ?? "—"}
                  </p>
                </div>
                <div className="bg-amber-50 rounded-lg p-3 shrink-0">
                  <Trophy className="h-5 w-5 text-amber-600" />
                </div>
              </div>
              {topThreat && (
                <p className="text-xs text-gray-400 mt-2">
                  {topThreat.encounters} побед, ср.дисконт {Number(topThreat.avgDiscount ?? 0).toFixed(1)}%
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* List */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12 text-gray-400">
                <RefreshCw className="h-4 w-4 animate-spin mr-2" /> Загрузка...
              </div>
            ) : competitors.length === 0 ? (
              <div className="text-center py-12">
                <Sword className="h-10 w-10 text-gray-200 mx-auto mb-3" />
                <p className="text-sm text-gray-500">Конкуренты появятся автоматически</p>
                <p className="text-xs text-gray-400 mt-1">При переводе лота в "Проиграно" укажите победителя</p>
              </div>
            ) : (
              <div>
                <div className="grid grid-cols-12 gap-3 px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide bg-gray-50 border-b">
                  <div className="col-span-4">Конкурент</div>
                  <div className="col-span-2 text-center">Побед</div>
                  <div className="col-span-3 text-right">Сумма всех побед</div>
                  <div className="col-span-2 text-right">Ср. дисконт</div>
                  <div className="col-span-1" />
                </div>
                <div className="divide-y divide-gray-100">
                  {competitors.map((c, idx) => {
                    const discount = Number(c.avgDiscount ?? 0);
                    const last = c.lossRecords[0];
                    return (
                      <div key={c.id} className="grid grid-cols-12 gap-3 px-5 py-3.5 items-center hover:bg-gray-50 transition-colors">
                        <div className="col-span-4 min-w-0">
                          <div className="flex items-center gap-2">
                            {idx === 0 && c.encounters > 0 && (
                              <span className="text-[10px] uppercase font-semibold tracking-wider text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                                #1
                              </span>
                            )}
                            <p className="text-sm font-medium text-gray-900 truncate">{c.name}</p>
                          </div>
                          {c.bin && <p className="text-xs text-gray-400 mt-0.5">БИН: {c.bin}</p>}
                          {last && (
                            <p className="text-xs text-gray-400 mt-0.5 truncate">
                              Последняя: {last.pipeline.lot.tender.customerName ?? last.pipeline.lot.tender.name}
                            </p>
                          )}
                        </div>
                        <div className="col-span-2 text-center">
                          <span className="text-lg font-semibold text-gray-900">{c.encounters}</span>
                        </div>
                        <div className="col-span-3 text-right">
                          <span className="text-sm font-semibold text-red-700">
                            {c.totalWinAmount ? formatCurrency(Number(c.totalWinAmount)) : "—"}
                          </span>
                        </div>
                        <div className="col-span-2 text-right">
                          {discount !== 0 ? (
                            <Badge variant={discount > 15 ? "destructive" : discount > 5 ? "warning" : "secondary"}>
                              {discount.toFixed(1)}%
                            </Badge>
                          ) : <span className="text-xs text-gray-400">—</span>}
                        </div>
                        <div className="col-span-1 flex justify-end">
                          <Link href={`/competitors/${c.id}`} className="text-gray-400 hover:text-blue-600 p-1">
                            <Eye className="h-4 w-4" />
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
