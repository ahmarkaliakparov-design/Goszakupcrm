"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { formatCurrency } from "@/lib/utils";

const REASONS = [
  { value: "PRICE_TOO_HIGH", label: "Наша цена была выше" },
  { value: "WRONG_SPECS", label: "Не соответствовали ТЗ" },
  { value: "LATE_SUBMISSION", label: "Опоздали с подачей" },
  { value: "DOCUMENTS", label: "Проблемы с документами" },
  { value: "DISQUALIFIED", label: "Дисквалификация" },
  { value: "CUSTOMER_PREFERENCE", label: "Предпочтение заказчика" },
  { value: "OTHER", label: "Другая причина" },
];

interface LossModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  pipelineId: string | null;
  lotName?: string;
  ourSubmittedPrice?: number | null;
}

interface CompetitorOption { id: string; name: string }

export function LossModal({ open, onClose, onSuccess, pipelineId, lotName, ourSubmittedPrice }: LossModalProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [competitors, setCompetitors] = useState<CompetitorOption[]>([]);

  const [winnerName, setWinnerName] = useState("");
  const [winnerBin, setWinnerBin] = useState("");
  const [winningPrice, setWinningPrice] = useState("");
  const [ourPrice, setOurPrice] = useState(ourSubmittedPrice?.toString() ?? "");
  const [reason, setReason] = useState("PRICE_TOO_HIGH");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (open) {
      setOurPrice(ourSubmittedPrice?.toString() ?? "");
      fetch("/api/competitors")
        .then((r) => r.json())
        .then((list) => setCompetitors(list.map((c: CompetitorOption) => ({ id: c.id, name: c.name }))))
        .catch(() => {});
    }
  }, [open, ourSubmittedPrice]);

  const ourNum = parseFloat(ourPrice);
  const winNum = parseFloat(winningPrice);
  const discount = !isNaN(ourNum) && !isNaN(winNum) && ourNum > 0 ? ((ourNum - winNum) / ourNum) * 100 : null;

  async function submit() {
    if (!pipelineId) return;
    setSaving(true);
    const res = await fetch(`/api/pipeline/${pipelineId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "loss",
        winnerName: winnerName.trim() || undefined,
        winnerBin: winnerBin.trim() || undefined,
        winningPrice: winningPrice ? parseFloat(winningPrice) : undefined,
        ourPrice: ourPrice ? parseFloat(ourPrice) : undefined,
        reason,
        notes: notes.trim() || undefined,
      }),
    });
    if (res.ok) {
      toast("Проигрыш записан, конкурент обновлён");
      onSuccess();
      onClose();
      setWinnerName(""); setWinnerBin(""); setWinningPrice(""); setNotes("");
    } else {
      const err = await res.json();
      toast(err.error ?? "Ошибка", "error");
    }
    setSaving(false);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Запись проигрыша</DialogTitle>
          <DialogDescription>
            {lotName ? <>Лот: <strong>{lotName}</strong>. </> : null}
            Данные пополнят базу конкурентов и помогут улучшить ценовую стратегию.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Кто выиграл</Label>
            <Input
              placeholder="ТОО Рога и Копыта"
              value={winnerName}
              onChange={(e) => setWinnerName(e.target.value)}
              list="competitors-list"
            />
            <datalist id="competitors-list">
              {competitors.map((c) => <option key={c.id} value={c.name} />)}
            </datalist>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>БИН победителя</Label>
              <Input
                placeholder="123456789012"
                maxLength={12}
                value={winnerBin}
                onChange={(e) => setWinnerBin(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Причина проигрыша</Label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {REASONS.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Наша цена, ₸</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="500000"
                value={ourPrice}
                onChange={(e) => setOurPrice(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Победная цена, ₸</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="450000"
                value={winningPrice}
                onChange={(e) => setWinningPrice(e.target.value)}
              />
            </div>
          </div>

          {discount !== null && (
            <div className={`text-sm rounded-md p-3 border ${
              discount > 15 ? "bg-red-50 border-red-200 text-red-700" :
              discount > 5 ? "bg-amber-50 border-amber-200 text-amber-700" :
              "bg-blue-50 border-blue-200 text-blue-700"
            }`}>
              📉 Разрыв: <strong>{discount.toFixed(1)}%</strong>
              {!isNaN(ourNum) && !isNaN(winNum) ? (
                <> · Победитель дешевле на <strong>{formatCurrency(ourNum - winNum)}</strong></>
              ) : null}
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Заметки</Label>
            <Textarea
              rows={2}
              placeholder="Например: заказчик упомянул, что давно работает с этим поставщиком"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Отмена</Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? "Сохранение..." : "Записать проигрыш"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
