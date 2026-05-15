"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ArrowLeft, Sword, TrendingDown, RefreshCw } from "lucide-react";

interface LossDetail {
  id: string;
  createdAt: string;
  winningPrice: string | null;
  ourPrice: string | null;
  reason: string;
  notes: string | null;
  pipeline: {
    id: string;
    lot: {
      id: string;
      name: string;
      ktru: string | null;
      tender: { name: string; customerName: string | null; customerBin: string | null };
    };
  };
}

interface CompetitorDetail {
  id: string;
  name: string;
  bin: string | null;
  encounters: number;
  totalWinAmount: string | null;
  avgDiscount: string | null;
  notes: string | null;
  createdAt: string;
  lossRecords: LossDetail[];
}

const REASON_LABELS: Record<string, string> = {
  PRICE_TOO_HIGH: "Цена была выше",
  WRONG_SPECS: "Не подошёл по ТЗ",
  LATE_SUBMISSION: "Опоздание с подачей",
  DOCUMENTS: "Проблемы с документами",
  DISQUALIFIED: "Дисквалификация",
  CUSTOMER_PREFERENCE: "Предпочтение заказчика",
  OTHER: "Другая причина",
};

export default function CompetitorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [comp, setComp] = useState<CompetitorDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    const res = await fetch(`/api/competitors/${id}`);
    if (res.ok) setComp(await res.json());
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return (
      <div>
        <Header title="Конкурент" />
        <div className="p-6 flex items-center gap-2 text-gray-400 text-sm">
          <RefreshCw className="h-4 w-4 animate-spin" /> Загрузка...
        </div>
      </div>
    );
  }

  if (!comp) {
    return (
      <div>
        <Header title="Не найден" />
        <div className="p-6">
          <Link href="/competitors" className="text-blue-600 hover:underline text-sm">← К списку</Link>
        </div>
      </div>
    );
  }

  // Per-customer breakdown
  const byCustomer: Record<string, { count: number; total: number; name: string }> = {};
  for (const r of comp.lossRecords) {
    const key = r.pipeline.lot.tender.customerName ?? "Без названия";
    if (!byCustomer[key]) byCustomer[key] = { count: 0, total: 0, name: key };
    byCustomer[key].count++;
    byCustomer[key].total += Number(r.winningPrice ?? 0);
  }
  const customerStats = Object.values(byCustomer).sort((a, b) => b.count - a.count);

  return (
    <div>
      <Header
        title={comp.name}
        subtitle={comp.bin ? `БИН: ${comp.bin}` : "Конкурент"}
        actions={
          <Link href="/competitors">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />Назад
            </Button>
          </Link>
        }
      />

      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-5">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Раз обошёл нас</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{comp.encounters}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Суммарно забрал</p>
              <p className="text-3xl font-bold text-red-700 mt-1">
                {comp.totalWinAmount ? formatCurrency(Number(comp.totalWinAmount)) : "—"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Средний дисконт</p>
              <p className="text-3xl font-bold text-amber-700 mt-1">
                {Number(comp.avgDiscount ?? 0).toFixed(1)}%
              </p>
              <p className="text-xs text-gray-400 mt-1">Насколько они дешевле</p>
            </CardContent>
          </Card>
        </div>

        {/* Customers breakdown */}
        {customerStats.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">У каких заказчиков чаще выигрывает</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {customerStats.map((c) => (
                <div key={c.name} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm font-medium text-gray-700">{c.count}×</span>
                    <span className="text-sm text-gray-600 truncate">{c.name}</span>
                  </div>
                  <span className="text-sm text-red-700 font-medium">{formatCurrency(c.total)}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* All losses */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">История проигрышей этому конкуренту</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-100">
              {comp.lossRecords.map((r) => {
                const ours = Number(r.ourPrice ?? 0);
                const winning = Number(r.winningPrice ?? 0);
                const discount = ours > 0 && winning > 0 ? ((ours - winning) / ours) * 100 : null;
                return (
                  <div key={r.id} className="px-5 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <Link href={`/lots/${r.pipeline.lot.id}`} className="text-sm font-medium text-gray-900 hover:text-blue-600 hover:underline">
                          {r.pipeline.lot.name}
                        </Link>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {r.pipeline.lot.tender.customerName ?? r.pipeline.lot.tender.name}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <Badge variant="outline">{REASON_LABELS[r.reason]}</Badge>
                          <span className="text-xs text-gray-400">{formatDate(r.createdAt)}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-xs text-gray-500">Наша → их</div>
                        <div className="text-sm font-medium text-gray-900 mt-0.5">
                          {r.ourPrice ? formatCurrency(ours) : "?"} → <span className="text-red-700">{r.winningPrice ? formatCurrency(winning) : "?"}</span>
                        </div>
                        {discount !== null && (
                          <div className="text-xs text-amber-700 mt-0.5">-{discount.toFixed(1)}%</div>
                        )}
                      </div>
                    </div>
                    {r.notes && <p className="text-xs text-gray-500 mt-2 bg-gray-50 px-2 py-1.5 rounded">{r.notes}</p>}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
