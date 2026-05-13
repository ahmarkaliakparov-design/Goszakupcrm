"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { formatCurrency, formatDate } from "@/lib/utils";
import { PIPE_STAGE_LABELS, PIPE_STAGE_COLORS } from "@/types";
import type { PipeStage } from "@/types";
import { ArrowLeft, Kanban, Clock, RefreshCw } from "lucide-react";

interface LotPipeline { id: string; stage: PipeStage }
interface Lot {
  id: string;
  name: string;
  ktru: string | null;
  unit: string | null;
  quantity: string | null;
  totalPrice: string | null;
  description: string | null;
  pipeline: LotPipeline | null;
}
interface TenderDetail {
  id: string;
  name: string;
  customerName: string | null;
  customerBin: string | null;
  method: string | null;
  totalAmount: string | null;
  deadline: string | null;
  source: string;
  lots: Lot[];
}

const sourceLabels: Record<string, string> = {
  GOSZAKUP: "goszakup.gov.kz",
  SAMRUK: "Самрук-Казына",
  MITWORK: "MITWORK",
  OTHER: "Вручную",
};

export default function TenderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [tender, setTender] = useState<TenderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [addingLot, setAddingLot] = useState<string | null>(null);

  const fetchTender = useCallback(async () => {
    const res = await fetch(`/api/tenders/${id}`);
    if (res.ok) setTender(await res.json());
    else setTender(null);
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchTender(); }, [fetchTender]);

  async function addLotToPipeline(lotId: string) {
    setAddingLot(lotId);
    const res = await fetch("/api/pipeline", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lotId, stage: "FOUND" }),
    });
    if (res.ok) {
      toast("Лот добавлен в воронку");
      fetchTender();
    } else {
      const err = await res.json();
      toast(err.error ?? "Ошибка", "error");
    }
    setAddingLot(null);
  }

  if (loading) {
    return (
      <div>
        <Header title="Тендер" />
        <div className="p-6 flex items-center gap-2 text-gray-400 text-sm">
          <RefreshCw className="h-4 w-4 animate-spin" /> Загрузка...
        </div>
      </div>
    );
  }

  if (!tender) {
    return (
      <div>
        <Header title="Тендер не найден" />
        <div className="p-6">
          <Link href="/tenders" className="text-blue-600 hover:underline text-sm">← Вернуться к списку</Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header
        title={tender.name}
        subtitle={tender.customerName ?? ""}
        actions={
          <Link href="/tenders">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Тендеры
            </Button>
          </Link>
        }
      />

      <div className="p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Информация о тендере</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5 text-sm">
              <div>
                <span className="text-gray-500">Заказчик</span>
                <p className="font-medium mt-0.5">{tender.customerName ?? "—"}</p>
                {tender.customerBin && <p className="text-xs text-gray-400">БИН: {tender.customerBin}</p>}
              </div>
              <div>
                <span className="text-gray-500">Сумма</span>
                <p className="font-semibold mt-0.5 text-gray-900">
                  {tender.totalAmount ? formatCurrency(parseFloat(tender.totalAmount)) : "—"}
                </p>
              </div>
              <div>
                <span className="text-gray-500">Дедлайн</span>
                <p className="font-medium mt-0.5 flex items-center gap-1">
                  <Clock className="h-4 w-4 text-gray-400" />
                  {formatDate(tender.deadline)}
                </p>
              </div>
              <div>
                <span className="text-gray-500">Способ закупки</span>
                <p className="font-medium mt-0.5">{tender.method ?? "—"}</p>
              </div>
              <div>
                <span className="text-gray-500">Источник</span>
                <div className="mt-0.5">
                  <Badge variant="outline">{sourceLabels[tender.source] ?? tender.source}</Badge>
                </div>
              </div>
              <div>
                <span className="text-gray-500">Лотов</span>
                <p className="font-medium mt-0.5">{tender.lots.length}</p>
              </div>
              <div>
                <span className="text-gray-500">В воронке</span>
                <p className="font-medium mt-0.5">{tender.lots.filter((l) => l.pipeline).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Лоты ({tender.lots.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {tender.lots.length === 0 ? (
              <p className="text-center text-sm text-gray-400 py-8">Нет лотов</p>
            ) : (
              <div className="divide-y divide-gray-100">
                <div className="grid grid-cols-12 gap-3 px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide bg-gray-50">
                  <div className="col-span-5">Лот</div>
                  <div className="col-span-2">КТРУ</div>
                  <div className="col-span-2 text-right">Сумма</div>
                  <div className="col-span-2">Статус</div>
                  <div className="col-span-1" />
                </div>
                {tender.lots.map((lot) => (
                  <div key={lot.id} className="grid grid-cols-12 gap-3 px-5 py-4 items-center hover:bg-gray-50 transition-colors">
                    <div className="col-span-5 min-w-0">
                      <Link href={`/lots/${lot.id}`} className="text-sm font-medium text-gray-900 hover:text-blue-600 hover:underline line-clamp-2">
                        {lot.name}
                      </Link>
                      {lot.description && (
                        <p className="text-xs text-gray-400 mt-0.5 truncate">{lot.description}</p>
                      )}
                    </div>
                    <div className="col-span-2">
                      <span className="text-xs text-gray-500">{lot.ktru ?? "—"}</span>
                      {lot.quantity && (
                        <p className="text-xs text-gray-400">{lot.quantity} {lot.unit ?? "шт"}</p>
                      )}
                    </div>
                    <div className="col-span-2 text-right">
                      <span className="text-sm font-semibold text-gray-900">
                        {lot.totalPrice ? formatCurrency(parseFloat(lot.totalPrice)) : "—"}
                      </span>
                    </div>
                    <div className="col-span-2">
                      {lot.pipeline ? (
                        <Badge className={PIPE_STAGE_COLORS[lot.pipeline.stage]}>
                          {PIPE_STAGE_LABELS[lot.pipeline.stage]}
                        </Badge>
                      ) : (
                        <span className="text-xs text-gray-400">Не в воронке</span>
                      )}
                    </div>
                    <div className="col-span-1 flex justify-end">
                      {lot.pipeline ? (
                        <Link href={`/lots/${lot.id}`}>
                          <Button variant="ghost" size="icon" title="Открыть лот">
                            <Kanban className="h-4 w-4 text-blue-500" />
                          </Button>
                        </Link>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Добавить в воронку"
                          onClick={() => addLotToPipeline(lot.id)}
                          disabled={addingLot === lot.id}
                        >
                          <Kanban className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
