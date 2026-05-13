"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";

const schema = z.object({
  name: z.string().min(2, "Минимум 2 символа"),
  bin: z.string().optional(),
  contactName: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Некорректный email").optional().or(z.literal("")),
  category: z.string().optional(),
  paymentTerms: z.string().optional(),
  minOrder: z.string().optional(),
  deliveryDays: z.string().optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface SupplierFormProps {
  initialData?: Partial<FormData & { id: string }>;
  onSuccess: () => void;
  onCancel: () => void;
}

export function SupplierForm({ initialData, onSuccess, onCancel }: SupplierFormProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const isEdit = !!initialData?.id;

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: initialData ?? {},
  });

  async function onSubmit(data: FormData) {
    setLoading(true);
    try {
      const url = isEdit ? `/api/suppliers/${initialData!.id}` : "/api/suppliers";
      const method = isEdit ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          minOrder: data.minOrder ? parseFloat(data.minOrder) : undefined,
          deliveryDays: data.deliveryDays ? parseInt(data.deliveryDays) : undefined,
          email: data.email || undefined,
        }),
      });
      if (!res.ok) throw new Error();
      toast(isEdit ? "Поставщик обновлён" : "Поставщик добавлен");
      onSuccess();
    } catch {
      toast("Ошибка сохранения", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1.5">
        <Label>Название *</Label>
        <Input placeholder="ТОО KazOffice Supply" {...register("name")} />
        {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>БИН</Label>
          <Input placeholder="123456789012" {...register("bin")} />
        </div>
        <div className="space-y-1.5">
          <Label>Категория товаров</Label>
          <Input placeholder="Офисные товары" {...register("category")} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Контактное лицо</Label>
          <Input placeholder="Иван Иванов" {...register("contactName")} />
        </div>
        <div className="space-y-1.5">
          <Label>Телефон</Label>
          <Input placeholder="+7 701 234 5678" {...register("phone")} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Email</Label>
        <Input type="email" placeholder="supplier@example.kz" {...register("email")} />
        {errors.email && <p className="text-xs text-red-600">{errors.email.message}</p>}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label>Условия оплаты</Label>
          <Input placeholder="30 дней отсрочка" {...register("paymentTerms")} />
        </div>
        <div className="space-y-1.5">
          <Label>Мин. заказ (₸)</Label>
          <Input type="number" placeholder="50000" {...register("minOrder")} />
        </div>
        <div className="space-y-1.5">
          <Label>Срок доставки (дн.)</Label>
          <Input type="number" placeholder="3" {...register("deliveryDays")} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Заметки</Label>
        <Textarea rows={2} placeholder="Дополнительная информация..." {...register("notes")} />
      </div>

      <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
        <Button type="button" variant="outline" onClick={onCancel}>Отмена</Button>
        <Button type="submit" disabled={loading}>
          {loading ? "Сохраняем..." : isEdit ? "Обновить" : "Добавить поставщика"}
        </Button>
      </div>
    </form>
  );
}
