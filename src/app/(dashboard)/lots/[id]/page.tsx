"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CostCalculator } from "@/components/calculator/CostCalculator";
import { LossModal } from "@/components/pipeline/LossModal";
import { useToast } from "@/components/ui/toast";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import { PIPE_STAGE_LABELS, PIPE_STAGE_COLORS, PRIORITY_LABELS } from "@/types";
import type { PipeStage } from "@/types";
import { ArrowLeft, Send, Clock, History, FileText, Brain } from "lucide-react";

interface Comment { id: string; text: string; createdAt: string; authorId: string | null }
interface HistoryEntry { id: string; fromStage: PipeStage | null; toStage: PipeStage; changedAt: string }
interface Pipeline {
  id: string;
  stage: PipeStage;
  priority: string;
  notes: string | null;
  submittedPrice: string | null;
  wonAt: string | null;
  lostAt: string | null;
  lostReason: string | null;
  comments: Comment[];
  history: HistoryEntry[];
}
interface LotData {
  id: string;
  name: string;
  ktru: string | null;
  unit: string | null;
  quantity: string | null;
  unitPrice: string | null;
  totalPrice: string | null;
  description: string | null;
  tender: {
    id: string;
    name: string;
    customerName: string | null;
    deadline: string | null;
    method: string | null;
  };
  pipeline: Pipeline | null;
  costCalculations: Array<{
    id: string;
    totalCost: string;
    recommendedPrice: string;
    desiredMargin: string;
    createdAt: string;
  }>;
}

const STAGES: PipeStage[] = ["FOUND", "ANALYSIS", "CALCULATION", "SUBMITTED", "WON", "LOST", "CONTRACT", "DELIVERY", "PAYMENT", "CLOSED"];

export default function LotDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [lot, setLot] = useState<LotData | null>(null);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState("");
  const [sendingComment, setSendingComment] = useState(false);
  const [changingStage, setChangingStage] = useState(false);
  const [showLossModal, setShowLossModal] = useState(false);

  const fetchLot = useCallback(async () => {
    const res = await fetch(`/api/lots/${id}`);
    if (res.ok) {
      setLot(await res.json());
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchLot(); }, [fetchLot]);

  async function changeStage(newStage: PipeStage) {
    if (!lot?.pipeline) return;
    if (newStage === "LOST") {
      setShowLossModal(true);
      return;
    }
    setChangingStage(true);
    const res = await fetch(`/api/pipeline/${lot.pipeline.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage: newStage }),
    });
    if (res.ok) {
      toast(`Статус изменён на "${PIPE_STAGE_LABELS[newStage]}"`);
      fetchLot();
    } else {
      toast("Ошибка изменения статуса", "error");
    }
    setChangingStage(false);
  }

  async function sendComment() {
    if (!lot?.pipeline || !commentText.trim()) return;
    setSendingComment(true);
    const res = await fetch(`/api/pipeline/${lot.pipeline.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "comment", text: commentText.trim() }),
    });
    if (res.ok) {
      setCommentText("");
      fetchLot();
    } else {
      toast("Ошибка отправки комментария", "error");
    }
    setSendingComment(false);
  }

  if (loading) {
    return (
      <div>
        <Header title="Лот" />
        <div className="p-6 text-gray-400 text-sm">Загрузка...</div>
      </div>
    );
  }

  if (!lot) {
    return (
      <div>
        <Header title="Лот не найден" />
        <div className="p-6">
          <Link href="/pipeline" className="text-blue-600 hover:underline text-sm">← Вернуться в воронку</Link>
        </div>
      </div>
    );
  }

  const latestCalc = lot.costCalculations[0];

  return (
    <div>
      <LossModal
        open={showLossModal}
        pipelineId={lot.pipeline?.id ?? null}
        lotName={lot.name}
        ourSubmittedPrice={lot.pipeline?.submittedPrice ? parseFloat(lot.pipeline.submittedPrice) : null}
        onClose={() => setShowLossModal(false)}
        onSuccess={() => fetchLot()}
      />
      <Header
        title={lot.name}
        subtitle={lot.tender.name}
        actions={
          <Link href="/pipeline">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Воронка
            </Button>
          </Link>
        }
      />

      <div className="p-6">
        <div className="grid grid-cols-3 gap-6">
          {/* Left: lot info + pipeline */}
          <div className="col-span-2 space-y-4">
            {/* Stage & priority */}
            {lot.pipeline ? (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">Стадия:</span>
                      <Select
                        value={lot.pipeline.stage}
                        onValueChange={(v) => changeStage(v as PipeStage)}
                        disabled={changingStage}
                      >
                        <SelectTrigger className="w-48">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STAGES.map((s) => (
                            <SelectItem key={s} value={s}>{PIPE_STAGE_LABELS[s]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Badge className={PIPE_STAGE_COLORS[lot.pipeline.stage]}>
                      {PIPE_STAGE_LABELS[lot.pipeline.stage]}
                    </Badge>
                    <Badge variant="outline">{PRIORITY_LABELS[lot.pipeline.priority as keyof typeof PRIORITY_LABELS]}</Badge>
                    {lot.pipeline.submittedPrice && (
                      <span className="text-sm text-gray-600">
                        Подана цена: <strong>{formatCurrency(parseFloat(lot.pipeline.submittedPrice))}</strong>
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-4 flex items-center justify-between">
                  <p className="text-sm text-gray-500">Лот не добавлен в воронку</p>
                  <Button size="sm" onClick={async () => {
                    const res = await fetch("/api/pipeline", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ lotId: lot.id, stage: "FOUND" }),
                    });
                    if (res.ok) { toast("Добавлен в воронку"); fetchLot(); }
                  }}>
                    Добавить в воронку
                  </Button>
                </CardContent>
              </Card>
            )}

            <Tabs defaultValue="info">
              <TabsList>
                <TabsTrigger value="info">
                  <FileText className="h-4 w-4 mr-1.5" /> Информация
                </TabsTrigger>
                <TabsTrigger value="comments">
                  <Send className="h-4 w-4 mr-1.5" />
                  Комментарии {lot.pipeline?.comments.length ? `(${lot.pipeline.comments.length})` : ""}
                </TabsTrigger>
                <TabsTrigger value="history">
                  <History className="h-4 w-4 mr-1.5" /> История
                </TabsTrigger>
                <TabsTrigger value="ai">
                  <Brain className="h-4 w-4 mr-1.5" /> ИИ-анализ
                </TabsTrigger>
              </TabsList>

              {/* Info tab */}
              <TabsContent value="info">
                <Card>
                  <CardContent className="p-5 space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Заказчик</span>
                        <p className="font-medium mt-0.5">{lot.tender.customerName ?? "—"}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Дедлайн</span>
                        <p className="font-medium mt-0.5 flex items-center gap-1">
                          <Clock className="h-4 w-4 text-gray-400" />
                          {formatDate(lot.tender.deadline)}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500">КТРУ</span>
                        <p className="font-medium mt-0.5">{lot.ktru ?? "—"}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Способ закупки</span>
                        <p className="font-medium mt-0.5">{lot.tender.method ?? "—"}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Количество</span>
                        <p className="font-medium mt-0.5">
                          {lot.quantity ? `${lot.quantity} ${lot.unit ?? "шт"}` : "—"}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500">Сумма лота</span>
                        <p className="font-medium mt-0.5">
                          {lot.totalPrice ? formatCurrency(parseFloat(lot.totalPrice)) : "—"}
                        </p>
                      </div>
                    </div>
                    {lot.description && (
                      <div>
                        <span className="text-sm text-gray-500">Описание / ТЗ</span>
                        <p className="text-sm text-gray-800 mt-1 whitespace-pre-line">{lot.description}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Comments tab */}
              <TabsContent value="comments">
                <Card>
                  <CardContent className="p-5">
                    {lot.pipeline ? (
                      <div className="space-y-4">
                        <div className="space-y-3 max-h-80 overflow-y-auto">
                          {lot.pipeline.comments.length === 0 ? (
                            <p className="text-sm text-gray-400 text-center py-4">Комментариев нет</p>
                          ) : (
                            lot.pipeline.comments.map((c) => (
                              <div key={c.id} className="flex gap-3">
                                <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-600 text-xs flex items-center justify-center shrink-0 font-medium">
                                  Я
                                </div>
                                <div className="flex-1">
                                  <div className="bg-gray-50 rounded-lg px-3 py-2">
                                    <p className="text-sm text-gray-800">{c.text}</p>
                                  </div>
                                  <p className="text-xs text-gray-400 mt-1">{formatDateTime(c.createdAt)}</p>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                        <div className="flex gap-2 pt-2 border-t border-gray-100">
                          <Textarea
                            placeholder="Добавить заметку..."
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            rows={2}
                            className="flex-1"
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) sendComment();
                            }}
                          />
                          <Button
                            onClick={sendComment}
                            disabled={sendingComment || !commentText.trim()}
                            size="icon"
                            className="self-end"
                          >
                            <Send className="h-4 w-4" />
                          </Button>
                        </div>
                        <p className="text-xs text-gray-400">Ctrl+Enter для отправки</p>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400 text-center py-4">
                        Добавьте лот в воронку для комментариев
                      </p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* History tab */}
              <TabsContent value="history">
                <Card>
                  <CardContent className="p-5">
                    {lot.pipeline?.history.length ? (
                      <div className="space-y-2">
                        {lot.pipeline.history.map((h) => (
                          <div key={h.id} className="flex items-center gap-3 text-sm">
                            <span className="text-xs text-gray-400 w-32 shrink-0">{formatDateTime(h.changedAt)}</span>
                            <div className="flex items-center gap-2">
                              {h.fromStage && (
                                <>
                                  <Badge className={PIPE_STAGE_COLORS[h.fromStage]}>{PIPE_STAGE_LABELS[h.fromStage]}</Badge>
                                  <span className="text-gray-400">→</span>
                                </>
                              )}
                              <Badge className={PIPE_STAGE_COLORS[h.toStage]}>{PIPE_STAGE_LABELS[h.toStage]}</Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400 text-center py-4">История пуста</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* AI tab */}
              <TabsContent value="ai">
                <Card>
                  <CardContent className="p-5 text-center py-10 space-y-3">
                    <Brain className="h-10 w-10 text-gray-300 mx-auto" />
                    <p className="text-sm font-medium text-gray-600">ИИ-анализ ТЗ</p>
                    <p className="text-xs text-gray-400 max-w-sm mx-auto">
                      Автоматический разбор технического задания, поиск ловушек и оценка лота по 10-балльной шкале.
                      Доступно после подключения Claude API в настройках.
                    </p>
                    <Button variant="outline" size="sm" disabled>
                      Требуется Claude API Key
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Right: calculator + last calc */}
          <div className="space-y-4">
            <CostCalculator
              lotId={lot.id}
              suggestedAmount={lot.totalPrice ? parseFloat(lot.totalPrice) : undefined}
              ktru={lot.ktru}
            />

            {latestCalc && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Последний расчёт</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Себестоимость</span>
                    <span>{formatCurrency(parseFloat(latestCalc.totalCost))}</span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span className="text-gray-700">Рекомендуемая цена</span>
                    <span className="text-blue-700">{formatCurrency(parseFloat(latestCalc.recommendedPrice))}</span>
                  </div>
                  <p className="text-xs text-gray-400">{formatDateTime(latestCalc.createdAt)}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
