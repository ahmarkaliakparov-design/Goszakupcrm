"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { ArrowLeft, Shield, AlertTriangle, CheckCircle2, RefreshCw, MapPin, Clock, Star, Sword } from "lucide-react";

interface Intel {
  customer: { id: string; name: string; bin: string; region: string | null; paymentDays: number | null; rating: number | null };
  totalTenders: number;
  participatedTenders: number;
  wonCount: number;
  lostCount: number;
  winRate: number;
  totalWonAmount: number;
  avgTenderAmount: number;
  avgPaymentDays: number | null;
  topCompetitors: Array<{ name: string; wins: number }>;
  riskScore: number;
  riskLevel: "low" | "medium" | "high";
  riskFactors: string[];
}

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<Intel | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchIntel = useCallback(async () => {
    const res = await fetch(`/api/intelligence/customers/${id}`);
    if (res.ok) setData(await res.json());
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchIntel(); }, [fetchIntel]);

  if (loading) {
    return (
      <div>
        <Header title="Заказчик" />
        <div className="p-6 flex items-center gap-2 text-gray-400 text-sm">
          <RefreshCw className="h-4 w-4 animate-spin" /> Загрузка профиля...
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div>
        <Header title="Не найден" />
        <div className="p-6">
          <Link href="/customers" className="text-blue-600 hover:underline text-sm">← К списку</Link>
        </div>
      </div>
    );
  }

  const c = data.customer;
  const riskColor = data.riskLevel === "high" ? "red" : data.riskLevel === "medium" ? "amber" : "green";
  const riskIcon = data.riskLevel === "high" ? AlertTriangle : data.riskLevel === "medium" ? Shield : CheckCircle2;
  const RiskIcon = riskIcon;
  const riskLabel = data.riskLevel === "high" ? "Высокий риск" : data.riskLevel === "medium" ? "Средний риск" : "Низкий риск";

  return (
    <div>
      <Header
        title={c.name}
        subtitle={`БИН: ${c.bin}`}
        actions={
          <Link href="/customers">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />Назад
            </Button>
          </Link>
        }
      />

      <div className="p-6 space-y-6">
        {/* Risk Card */}
        <Card className={`border-2 ${
          riskColor === "red" ? "border-red-200 bg-red-50/50" :
          riskColor === "amber" ? "border-amber-200 bg-amber-50/50" :
          "border-green-200 bg-green-50/50"
        }`}>
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 flex-1">
                <div className={`rounded-lg p-2.5 ${
                  riskColor === "red" ? "bg-red-100" :
                  riskColor === "amber" ? "bg-amber-100" :
                  "bg-green-100"
                }`}>
                  <RiskIcon className={`h-6 w-6 ${
                    riskColor === "red" ? "text-red-700" :
                    riskColor === "amber" ? "text-amber-700" :
                    "text-green-700"
                  }`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-baseline gap-3">
                    <h3 className={`text-lg font-semibold ${
                      riskColor === "red" ? "text-red-900" :
                      riskColor === "amber" ? "text-amber-900" :
                      "text-green-900"
                    }`}>{riskLabel}</h3>
                    <span className="text-sm text-gray-500">Скор: {data.riskScore}/100</span>
                  </div>
                  {data.riskFactors.length > 0 ? (
                    <ul className="mt-2 space-y-1">
                      {data.riskFactors.map((f, i) => (
                        <li key={i} className="text-sm text-gray-700 flex items-center gap-2">
                          <span className="w-1 h-1 bg-gray-400 rounded-full" />{f}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-600 mt-1">Признаков риска не обнаружено</p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-5">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Тендеров</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{data.totalTenders}</p>
              <p className="text-xs text-gray-400 mt-1">{data.participatedTenders} в работе</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Win rate</p>
              <p className={`text-2xl font-bold mt-1 ${
                data.winRate > 0.5 ? "text-green-700" : data.winRate > 0.3 ? "text-amber-700" : "text-red-700"
              }`}>{Math.round(data.winRate * 100)}%</p>
              <p className="text-xs text-gray-400 mt-1">{data.wonCount} побед / {data.lostCount} поражений</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Заработано</p>
              <p className="text-2xl font-bold text-green-700 mt-1">{formatCurrency(data.totalWonAmount)}</p>
              <p className="text-xs text-gray-400 mt-1">Сумма выигранных</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Платит на</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {data.avgPaymentDays !== null ? Math.round(data.avgPaymentDays) : c.paymentDays ?? "?"}
              </p>
              <p className="text-xs text-gray-400 mt-1">день после контракта</p>
            </CardContent>
          </Card>
        </div>

        {/* Profile + competitors */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Профиль заказчика</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <MapPin className="h-4 w-4 text-gray-400" />
                <span className="text-gray-500 w-32">Регион</span>
                <span className="font-medium">{c.region ?? "—"}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Clock className="h-4 w-4 text-gray-400" />
                <span className="text-gray-500 w-32">Срок оплаты</span>
                <span className="font-medium">{c.paymentDays ?? "—"} дней</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Star className="h-4 w-4 text-gray-400" />
                <span className="text-gray-500 w-32">Рейтинг</span>
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={`h-3.5 w-3.5 ${i < (c.rating ?? 0) ? "fill-yellow-400 text-yellow-400" : "text-gray-200"}`} />
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span className="text-gray-500 w-32 pl-7">Ср. сумма тендера</span>
                <span className="font-medium">{formatCurrency(data.avgTenderAmount)}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Sword className="h-4 w-4 text-red-500" />
                Кто выигрывает у этого заказчика
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.topCompetitors.length === 0 ? (
                <p className="text-sm text-gray-400 py-4 text-center">Нет данных о конкурентах</p>
              ) : (
                <div className="space-y-2">
                  {data.topCompetitors.map((c, i) => (
                    <div key={c.name} className="flex items-center justify-between py-1.5 border-b border-gray-100 last:border-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs text-gray-400 w-5">{i + 1}.</span>
                        <span className="text-sm text-gray-800 truncate">{c.name}</span>
                      </div>
                      <Badge variant="secondary">{c.wins}×</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
