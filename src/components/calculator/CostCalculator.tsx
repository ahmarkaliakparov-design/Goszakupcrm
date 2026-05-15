"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { Calculator, TrendingUp, Sparkles, Target } from "lucide-react";

interface CostCalculatorProps {
  lotId: string;
  suggestedAmount?: number | null;
  ktru?: string | null;
}

interface Calc {
  purchasePrice: number;
  deliveryCost: number;
  vatRate: number;
  contractDeposit: number;
  paymentDays: number;
  bankRate: number;
  desiredMargin: number;
}

interface KtruData {
  totalCalculations: number;
  wonCount: number;
  lostCount: number;
  winRate: number;
  avgPurchasePrice: number | null;
  avgRecommendedPrice: number | null;
  avgWinningPrice: number | null;
  avgMarginWon: number | null;
  avgMarginLost: number | null;
  suggestedMargin: number | null;
  suggestedPrice: number | null;
}

export function CostCalculator({ lotId, suggestedAmount, ktru }: CostCalculatorProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [ktruData, setKtruData] = useState<KtruData | null>(null);
  const [calc, setCalc] = useState<Calc>({
    purchasePrice: suggestedAmount ?? 0,
    deliveryCost: 0,
    vatRate: 12,
    contractDeposit: 3,
    paymentDays: 30,
    bankRate: 20,
    desiredMargin: 15,
  });

  useEffect(() => {
    if (!ktru) return;
    fetch(`/api/intelligence/ktru/${encodeURIComponent(ktru)}`)
      .then((r) => r.json())
      .then((data: KtruData) => {
        setKtruData(data);
      })
      .catch(() => {});
  }, [ktru]);

  const n = (v: number | string) => typeof v === "string" ? parseFloat(v) || 0 : v;

  const purchasePrice = n(calc.purchasePrice);
  const deliveryCost = n(calc.deliveryCost);
  const vatRate = n(calc.vatRate);
  const contractDeposit = n(calc.contractDeposit);
  const paymentDays = n(calc.paymentDays);
  const bankRate = n(calc.bankRate);
  const desiredMargin = n(calc.desiredMargin);

  const baseCost = purchasePrice + deliveryCost;
  const vatAmount = baseCost * (vatRate / 100);
  const depositAmount = baseCost * (contractDeposit / 100);
  const financingCost = depositAmount * (bankRate / 100) * (paymentDays / 365);
  const totalCost = baseCost + vatAmount + depositAmount + financingCost;
  const recommendedPrice = totalCost * (1 + desiredMargin / 100);
  const marginAmount = recommendedPrice - totalCost;
  const realMargin = totalCost > 0 ? ((recommendedPrice - totalCost) / recommendedPrice) * 100 : 0;

  // Comparison with historical winning price
  const priceVsHistory = ktruData?.avgWinningPrice && recommendedPrice
    ? ((recommendedPrice - ktruData.avgWinningPrice) / ktruData.avgWinningPrice) * 100
    : null;

  function setField(field: keyof Calc, value: string) {
    setCalc((prev) => ({ ...prev, [field]: parseFloat(value) || 0 }));
  }

  const applySuggestedMargin = useCallback(() => {
    if (ktruData?.suggestedMargin !== null && ktruData?.suggestedMargin !== undefined) {
      setCalc((prev) => ({ ...prev, desiredMargin: Math.round(ktruData.suggestedMargin! * 10) / 10 }));
      toast(`Применена маржа ${ktruData.suggestedMargin.toFixed(1)}% (на основе ${ktruData.totalCalculations} расчётов)`);
    }
  }, [ktruData, toast]);

  async function saveCalculation() {
    setSaving(true);
    try {
      const res = await fetch(`/api/lots/${lotId}/calculator`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          purchasePrice,
          deliveryCost,
          vatRate,
          vatAmount,
          contractDeposit: depositAmount,
          financingCost,
          totalCost,
          desiredMargin,
          recommendedPrice,
        }),
      });
      if (res.ok) toast("Расчёт сохранён");
      else toast("Ошибка сохранения", "error");
    } catch {
      toast("Ошибка сохранения", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-4 w-4 text-blue-600" />
          Калькулятор себестоимости
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* KTRU Intelligence */}
        {ktruData && ktruData.totalCalculations > 0 && (
          <div className="bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-600" />
              <span className="text-xs font-semibold text-purple-900 uppercase tracking-wide">
                КТРУ-память: {ktruData.totalCalculations} расчётов
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="text-center">
                <div className="text-gray-500">Win rate</div>
                <div className={`font-semibold ${ktruData.winRate > 0.5 ? "text-green-700" : ktruData.winRate > 0.3 ? "text-amber-700" : "text-red-700"}`}>
                  {(ktruData.winRate * 100).toFixed(0)}%
                </div>
              </div>
              <div className="text-center">
                <div className="text-gray-500">Победителей</div>
                <div className="font-semibold text-gray-900">
                  {ktruData.avgWinningPrice ? formatCurrency(ktruData.avgWinningPrice) : "—"}
                </div>
              </div>
              <div className="text-center">
                <div className="text-gray-500">Ср. маржа win</div>
                <div className="font-semibold text-green-700">
                  {ktruData.avgMarginWon !== null ? `${ktruData.avgMarginWon.toFixed(1)}%` : "—"}
                </div>
              </div>
            </div>
            {ktruData.suggestedMargin !== null && (
              <button
                onClick={applySuggestedMargin}
                className="w-full flex items-center justify-center gap-1.5 text-xs font-medium text-purple-700 hover:text-purple-900 bg-white/70 hover:bg-white rounded-md py-1.5 transition-colors border border-purple-200"
              >
                <Target className="h-3.5 w-3.5" />
                Применить рекомендуемую маржу {ktruData.suggestedMargin.toFixed(1)}%
              </button>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Закупочная цена (₸)</Label>
            <Input
              type="number"
              value={calc.purchasePrice || ""}
              onChange={(e) => setField("purchasePrice", e.target.value)}
              placeholder="0"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Доставка (₸)</Label>
            <Input
              type="number"
              value={calc.deliveryCost || ""}
              onChange={(e) => setField("deliveryCost", e.target.value)}
              placeholder="0"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">НДС (%)</Label>
            <Input
              type="number"
              step="0.1"
              value={calc.vatRate}
              onChange={(e) => setField("vatRate", e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Обеспечение договора (%)</Label>
            <Input
              type="number"
              step="0.1"
              value={calc.contractDeposit}
              onChange={(e) => setField("contractDeposit", e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Срок ожидания оплаты (дней)</Label>
            <Input
              type="number"
              value={calc.paymentDays}
              onChange={(e) => setField("paymentDays", e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Ставка кредита (% в год)</Label>
            <Input
              type="number"
              step="0.1"
              value={calc.bankRate}
              onChange={(e) => setField("bankRate", e.target.value)}
            />
          </div>
        </div>

        <Separator />

        <div className="space-y-2 text-sm">
          <div className="flex justify-between text-gray-600">
            <span>База (закупка + доставка)</span>
            <span>{formatCurrency(baseCost)}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>НДС {vatRate}%</span>
            <span>{formatCurrency(vatAmount)}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Обеспечение {contractDeposit}%</span>
            <span>{formatCurrency(depositAmount)}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Стоимость финансирования ({paymentDays} д.)</span>
            <span>{formatCurrency(financingCost)}</span>
          </div>
          <Separator />
          <div className="flex justify-between font-semibold text-gray-900">
            <span>Себестоимость</span>
            <span>{formatCurrency(totalCost)}</span>
          </div>
        </div>

        <Separator />

        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Label className="text-xs shrink-0">Желаемая маржа (%)</Label>
            <Input
              type="number"
              step="0.5"
              value={calc.desiredMargin}
              onChange={(e) => setField("desiredMargin", e.target.value)}
              className="w-24"
            />
          </div>

          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-semibold text-blue-900">Рекомендуемая цена подачи</span>
            </div>
            <div className="text-2xl font-bold text-blue-700">{formatCurrency(recommendedPrice)}</div>
            <div className="text-xs text-blue-600 mt-1">
              Прибыль: {formatCurrency(marginAmount)} ({realMargin.toFixed(1)}% от цены)
            </div>
            {priceVsHistory !== null && (
              <div className={`text-xs mt-2 pt-2 border-t border-blue-200 ${
                priceVsHistory > 10 ? "text-red-700" :
                priceVsHistory > 0 ? "text-amber-700" :
                "text-green-700"
              }`}>
                {priceVsHistory > 0
                  ? `⚠️ На ${priceVsHistory.toFixed(1)}% выше средней победной цены`
                  : `✅ На ${Math.abs(priceVsHistory).toFixed(1)}% ниже средней победной цены`}
              </div>
            )}
          </div>
        </div>

        <Button onClick={saveCalculation} disabled={saving || totalCost === 0} size="sm" className="w-full">
          {saving ? "Сохраняем..." : "Сохранить расчёт"}
        </Button>
      </CardContent>
    </Card>
  );
}
