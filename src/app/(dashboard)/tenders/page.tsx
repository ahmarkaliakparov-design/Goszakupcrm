"use client";

import { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TenderForm } from "@/components/tenders/TenderForm";
import { useToast } from "@/components/ui/toast";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Search, Plus, ExternalLink, Kanban, RefreshCw, Trash2 } from "lucide-react";
import Link from "next/link";

interface LotPipeline { stage: string }
interface Lot { id: string; name: string; pipeline: LotPipeline | null }
interface Tender {
  id: string;
  name: string;
  customerName: string | null;
  method: string | null;
  totalAmount: string | null;
  deadline: string | null;
  source: string;
  lots: Lot[];
  createdAt: string;
}

const sourceLabels: Record<string, string> = {
  GOSZAKUP: "goszakup.gov.kz",
  SAMRUK: "Самрук-Казына",
  MITWORK: "MITWORK",
  OTHER: "Вручную",
};

export default function TendersPage() {
  const { toast } = useToast();
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const fetchTenders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tenders?search=${encodeURIComponent(search)}&limit=50`);
      const data = await res.json();
      setTenders(data.tenders ?? []);
      setTotal(data.total ?? 0);
    } catch {
      toast("Ошибка загрузки тендеров", "error");
    } finally {
      setLoading(false);
    }
  }, [search, toast]);

  useEffect(() => {
    const timer = setTimeout(fetchTenders, 300);
    return () => clearTimeout(timer);
  }, [fetchTenders]);

  async function addToPipeline(lotId: string) {
    const res = await fetch("/api/pipeline", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lotId, stage: "FOUND" }),
    });
    if (res.ok) {
      toast("Лот добавлен в воронку");
      fetchTenders();
    } else {
      toast("Ошибка добавления в воронку", "error");
    }
  }

  async function deleteTender(id: string) {
    if (!confirm("Удалить тендер? Все лоты и записи воронки будут удалены.")) return;
    const res = await fetch(`/api/tenders/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast("Тендер удалён");
      fetchTenders();
    } else {
      toast("Ошибка удаления", "error");
    }
  }

  return (
    <div>
      <Header
        title="Тендеры"
        subtitle={`Всего: ${total}`}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={fetchTenders}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Обновить
            </Button>
            <Button size="sm" onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Добавить тендер
            </Button>
          </>
        }
      />

      <div className="p-6 space-y-4">
        {/* Search */}
        <Card>
          <CardContent className="p-4">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Поиск по наименованию, заказчику..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* List */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-16 text-gray-400">
                <RefreshCw className="h-5 w-5 animate-spin mr-2" />
                Загрузка...
              </div>
            ) : tenders.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-gray-400 text-sm mb-3">
                  {search ? "Ничего не найдено" : "Тендеров ещё нет"}
                </p>
                {!search && (
                  <Button size="sm" onClick={() => setShowForm(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Добавить первый тендер
                  </Button>
                )}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-12 gap-3 px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide bg-gray-50">
                  <div className="col-span-5">Тендер</div>
                  <div className="col-span-2 text-right">Сумма</div>
                  <div className="col-span-2">Дедлайн</div>
                  <div className="col-span-2">Лоты</div>
                  <div className="col-span-1" />
                </div>

                <div className="divide-y divide-gray-100">
                  {tenders.map((tender) => {
                    const lotsInPipeline = tender.lots.filter((l) => l.pipeline).length;
                    return (
                      <div key={tender.id} className="grid grid-cols-12 gap-3 px-5 py-4 items-center hover:bg-gray-50 transition-colors">
                        <div className="col-span-5 min-w-0">
                          <Link href={`/tenders/${tender.id}`} className="hover:underline">
                            <p className="text-sm font-medium text-gray-900 line-clamp-2">{tender.name}</p>
                          </Link>
                          <div className="flex gap-2 mt-0.5 items-center">
                            {tender.customerName && (
                              <p className="text-xs text-gray-500 truncate">{tender.customerName}</p>
                            )}
                            <Badge variant="outline">{sourceLabels[tender.source] ?? tender.source}</Badge>
                          </div>
                          {tender.method && (
                            <p className="text-xs text-gray-400 mt-0.5">{tender.method}</p>
                          )}
                        </div>

                        <div className="col-span-2 text-right">
                          <span className="text-sm font-semibold text-gray-900">
                            {tender.totalAmount ? formatCurrency(parseFloat(tender.totalAmount)) : "—"}
                          </span>
                        </div>

                        <div className="col-span-2">
                          <span className="text-sm text-gray-600">{formatDate(tender.deadline)}</span>
                        </div>

                        <div className="col-span-2">
                          <span className="text-sm text-gray-600">
                            {tender.lots.length} лот{tender.lots.length === 1 ? "" : tender.lots.length < 5 ? "а" : "ов"}
                          </span>
                          {lotsInPipeline > 0 && (
                            <span className="text-xs text-blue-600 ml-1">({lotsInPipeline} в воронке)</span>
                          )}
                        </div>

                        <div className="col-span-1 flex items-center justify-end gap-1">
                          {tender.lots.some((l) => !l.pipeline) && (
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Добавить лоты в воронку"
                              onClick={() => {
                                tender.lots.filter((l) => !l.pipeline).forEach((l) => addToPipeline(l.id));
                              }}
                            >
                              <Kanban className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Удалить"
                            onClick={() => deleteTender(tender.id)}
                          >
                            <Trash2 className="h-4 w-4 text-gray-400 hover:text-red-500" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="px-5 py-3 border-t border-gray-100 text-sm text-gray-500">
                  Показано {tenders.length} из {total}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add tender dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Добавить тендер вручную</DialogTitle>
          </DialogHeader>
          <TenderForm
            onSuccess={() => { setShowForm(false); fetchTenders(); }}
            onCancel={() => setShowForm(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
