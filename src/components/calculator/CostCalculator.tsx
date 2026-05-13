"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { Calculator, TrendingUp } from "lucide-react";

interface CostCalculatorProps {
  lotId: string;
  suggestedAmount?: number | null;
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

export function CostCalculator({ lotId, suggestedAmount }: CostCalculatorProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [calc, setCalc] = useState<Calc>({
    purchasePrice: suggestedAmount ?? 0,
    deliveryCost: 0,
    vatRate: 12,
    contractDeposit: 3,
    paymentDays: 30,
    bankRate: 20,
    desiredMargin: 15,
  });

  function n(v: number | string) {
    return typeof v === "string" ? parseFloat(v) || 0 : v;
  }

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

  function setField(field: keyof Calc, value: string) {
    setCalc((prev) => ({ ...prev, [field]: parseFloat(value) || 0 }));
  }

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
        {/* Inputs */}
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

        {/* Results */}
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

        {/* Margin & recommendation */}
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
          </div>
        </div>

        <Button onClick={saveCalculation} disabled={saving || totalCost === 0} size="sm" className="w-full">
          {saving ? "Сохраняем..." : "Сохранить расчёт"}
        </Button>
      </CardContent>
    </Card>
  );
}
