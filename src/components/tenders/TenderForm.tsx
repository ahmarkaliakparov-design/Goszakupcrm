"use client";

import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";

const schema = z.object({
  name: z.string().min(3, "Минимум 3 символа"),
  customerName: z.string().optional(),
  customerBin: z.string().optional(),
  method: z.string().optional(),
  source: z.enum(["GOSZAKUP", "SAMRUK", "MITWORK", "OTHER"]),
  totalAmount: z.string().optional(),
  deadline: z.string().optional(),
  lots: z.array(z.object({
    name: z.string().min(2, "Введите наименование"),
    ktru: z.string().optional(),
    unit: z.string().optional(),
    quantity: z.string().optional(),
    unitPrice: z.string().optional(),
    description: z.string().optional(),
  })).min(1, "Добавьте хотя бы один лот"),
});

type FormData = z.infer<typeof schema>;

interface TenderFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function TenderForm({ onSuccess, onCancel }: TenderFormProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, control, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      source: "OTHER",
      lots: [{ name: "", ktru: "", unit: "шт", quantity: "", unitPrice: "", description: "" }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "lots" });

  const watchedLots = watch("lots");

  async function onSubmit(data: FormData) {
    setLoading(true);
    try {
      const res = await fetch("/api/tenders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          customerName: data.customerName,
          customerBin: data.customerBin,
          method: data.method,
          source: data.source,
          totalAmount: data.totalAmount ? parseFloat(data.totalAmount) : undefined,
          deadline: data.deadline || undefined,
          lots: data.lots.map((l) => ({
            name: l.name,
            ktru: l.ktru || undefined,
            unit: l.unit || undefined,
            quantity: l.quantity ? parseFloat(l.quantity) : undefined,
            unitPrice: l.unitPrice ? parseFloat(l.unitPrice) : undefined,
            description: l.description || undefined,
          })),
        }),
      });

      if (!res.ok) throw new Error("Ошибка сохранения");
      toast("Тендер добавлен");
      onSuccess();
    } catch {
      toast("Ошибка при добавлении тендера", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* Tender info */}
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label>Наименование тендера *</Label>
          <Input placeholder="Поставка офисной мебели..." {...register("name")} />
          {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Заказчик</Label>
            <Input placeholder="Название организации" {...register("customerName")} />
          </div>
          <div className="space-y-1.5">
            <Label>БИН заказчика</Label>
            <Input placeholder="123456789012" {...register("customerBin")} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Способ закупки</Label>
            <Input placeholder="Запрос ценовых предложений" {...register("method")} />
          </div>
          <div className="space-y-1.5">
            <Label>Источник</Label>
            <Select
              onValueChange={(v) => setValue("source", v as FormData["source"])}
              defaultValue="OTHER"
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="GOSZAKUP">goszakup.gov.kz</SelectItem>
                <SelectItem value="SAMRUK">Самрук-Казына</SelectItem>
                <SelectItem value="MITWORK">MITWORK</SelectItem>
                <SelectItem value="OTHER">Другое</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Общая сумма (₸)</Label>
            <Input type="number" placeholder="0" {...register("totalAmount")} />
          </div>
          <div className="space-y-1.5">
            <Label>Дедлайн подачи</Label>
            <Input type="date" {...register("deadline")} />
          </div>
        </div>
      </div>

      {/* Lots */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-base">Лоты</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append({ name: "", ktru: "", unit: "шт", quantity: "", unitPrice: "", description: "" })}
          >
            <Plus className="h-4 w-4 mr-1" /> Добавить лот
          </Button>
        </div>

        {errors.lots && typeof errors.lots.message === "string" && (
          <p className="text-xs text-red-600">{errors.lots.message}</p>
        )}

        {fields.map((field, i) => {
          const qty = parseFloat(watchedLots[i]?.quantity ?? "0") || 0;
          const price = parseFloat(watchedLots[i]?.unitPrice ?? "0") || 0;
          const total = qty * price;

          return (
            <div key={field.id} className="border border-gray-200 rounded-lg p-4 space-y-3 bg-gray-50">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Лот {i + 1}</span>
                {fields.length > 1 && (
                  <button type="button" onClick={() => remove(i)} className="text-red-400 hover:text-red-600">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="space-y-1.5">
                <Label>Наименование *</Label>
                <Input placeholder="Стул офисный" {...register(`lots.${i}.name`)} />
                {errors.lots?.[i]?.name && (
                  <p className="text-xs text-red-600">{errors.lots[i]?.name?.message}</p>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1.5">
                  <Label>КТРУ</Label>
                  <Input placeholder="31.01.11.100" {...register(`lots.${i}.ktru`)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Единица</Label>
                  <Input placeholder="шт" {...register(`lots.${i}.unit`)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Количество</Label>
                  <Input type="number" step="0.01" placeholder="0" {...register(`lots.${i}.quantity`)} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label>Цена за единицу (₸)</Label>
                  <Input type="number" step="0.01" placeholder="0" {...register(`lots.${i}.unitPrice`)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Итого</Label>
                  <div className="flex h-9 items-center px-3 rounded-md border border-gray-200 bg-white text-sm font-medium text-gray-700">
                    {total > 0 ? new Intl.NumberFormat("ru-KZ").format(total) + " ₸" : "—"}
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Описание / примечание</Label>
                <Textarea rows={2} placeholder="Дополнительные требования..." {...register(`lots.${i}.description`)} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
        <Button type="button" variant="outline" onClick={onCancel}>Отмена</Button>
        <Button type="submit" disabled={loading}>
          {loading ? "Сохраняем..." : "Добавить тендер"}
        </Button>
      </div>
    </form>
  );
}
