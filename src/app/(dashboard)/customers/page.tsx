"use client";

import { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { Search, Plus, MapPin, Clock, Trash2, Star, RefreshCw } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

interface Customer {
  id: string;
  name: string;
  bin: string;
  region: string | null;
  category: string | null;
  paymentDays: number | null;
  rating: number | null;
  notes: string | null;
  isBlacklist: boolean;
}

const schema = z.object({
  name: z.string().min(2),
  bin: z.string().length(12, "БИН должен содержать 12 символов"),
  region: z.string().optional(),
  category: z.string().optional(),
  paymentDays: z.string().optional(),
  rating: z.string().optional(),
  notes: z.string().optional(),
  isBlacklist: z.boolean().optional(),
});
type FormData = z.infer<typeof schema>;

function CustomerForm({ initial, onSuccess, onCancel }: {
  initial?: Customer;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: initial ? {
      name: initial.name,
      bin: initial.bin,
      region: initial.region ?? "",
      category: initial.category ?? "",
      paymentDays: initial.paymentDays?.toString() ?? "",
      rating: initial.rating?.toString() ?? "3",
      notes: initial.notes ?? "",
      isBlacklist: initial.isBlacklist,
    } : { rating: "3" },
  });

  async function onSubmit(data: FormData) {
    setLoading(true);
    try {
      const url = initial ? `/api/customers/${initial.id}` : "/api/customers";
      const method = initial ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          paymentDays: data.paymentDays ? parseInt(data.paymentDays) : undefined,
          rating: data.rating ? parseInt(data.rating) : undefined,
          region: data.region || undefined,
          category: data.category || undefined,
          notes: data.notes || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Ошибка");
      }
      toast(initial ? "Заказчик обновлён" : "Заказчик добавлен");
      onSuccess();
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : "Ошибка сохранения", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1.5">
        <Label>Название *</Label>
        <Input placeholder="Управление образования г. Алматы" {...register("name")} />
        {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>БИН *</Label>
          <Input placeholder="123456789012" maxLength={12} {...register("bin")} />
          {errors.bin && <p className="text-xs text-red-600">{errors.bin.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>Регион</Label>
          <Input placeholder="Алматы" {...register("region")} />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label>Категория</Label>
          <Input placeholder="Образование" {...register("category")} />
        </div>
        <div className="space-y-1.5">
          <Label>Срок оплаты (дней)</Label>
          <Input type="number" placeholder="30" {...register("paymentDays")} />
        </div>
        <div className="space-y-1.5">
          <Label>Рейтинг (1-5)</Label>
          <Input type="number" min={1} max={5} placeholder="3" {...register("rating")} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Заметки</Label>
        <Textarea rows={2} placeholder="История работы, особенности..." {...register("notes")} />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>Отмена</Button>
        <Button type="submit" disabled={loading}>
          {loading ? "Сохраняем..." : initial ? "Обновить" : "Добавить"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export default function CustomersPage() {
  const { toast } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/customers?search=${encodeURIComponent(search)}`);
    if (res.ok) setCustomers(await res.json());
    setLoading(false);
  }, [search]);

  useEffect(() => {
    const t = setTimeout(fetchCustomers, 300);
    return () => clearTimeout(t);
  }, [fetchCustomers]);

  async function deleteCustomer(id: string) {
    if (!confirm("Удалить заказчика?")) return;
    const res = await fetch(`/api/customers/${id}`, { method: "DELETE" });
    if (res.ok) { toast("Удалён"); fetchCustomers(); }
    else toast("Ошибка", "error");
  }

  const ratingColors = ["", "text-red-500", "text-orange-500", "text-yellow-500", "text-blue-500", "text-green-500"];

  return (
    <div>
      <Header
        title="Заказчики"
        subtitle={`${customers.length} заказчиков`}
        actions={
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Добавить
          </Button>
        }
      />

      <div className="p-6 space-y-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Поиск по названию, БИН..."
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Button variant="outline" size="sm" onClick={fetchCustomers}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="text-center py-10 text-gray-400 text-sm">Загрузка...</div>
            ) : customers.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-gray-400 text-sm mb-3">Заказчиков нет</p>
                <Button size="sm" onClick={() => setShowForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Добавить первого
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                <div className="grid grid-cols-12 gap-3 px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide bg-gray-50">
                  <div className="col-span-4">Заказчик</div>
                  <div className="col-span-2">Регион</div>
                  <div className="col-span-2">Оплата</div>
                  <div className="col-span-2">Рейтинг</div>
                  <div className="col-span-2" />
                </div>

                {customers.map((c) => (
                  <div key={c.id} className="grid grid-cols-12 gap-3 px-5 py-4 items-center hover:bg-gray-50 transition-colors">
                    <div className="col-span-4 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{c.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-xs text-gray-400">БИН: {c.bin}</p>
                        {c.category && <Badge variant="outline" className="text-xs">{c.category}</Badge>}
                        {c.isBlacklist && <Badge variant="destructive" className="text-xs">⚠ Чёрный список</Badge>}
                      </div>
                    </div>
                    <div className="col-span-2">
                      {c.region && (
                        <span className="flex items-center gap-1 text-sm text-gray-600">
                          <MapPin className="h-3.5 w-3.5 text-gray-400" />
                          {c.region}
                        </span>
                      )}
                    </div>
                    <div className="col-span-2">
                      {c.paymentDays != null && (
                        <span className={`flex items-center gap-1 text-sm ${c.paymentDays > 60 ? "text-red-600" : "text-gray-600"}`}>
                          <Clock className="h-3.5 w-3.5 text-gray-400" />
                          {c.paymentDays} дней
                        </span>
                      )}
                    </div>
                    <div className="col-span-2">
                      {c.rating != null && (
                        <div className="flex items-center gap-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`h-3.5 w-3.5 ${i < c.rating! ? "fill-yellow-400 text-yellow-400" : "text-gray-200"}`}
                            />
                          ))}
                        </div>
                      )}
                      {c.notes && (
                        <p className="text-xs text-gray-400 mt-0.5 truncate" title={c.notes}>{c.notes}</p>
                      )}
                    </div>
                    <div className="col-span-2 flex justify-end gap-1">
                      <button
                        onClick={() => setEditCustomer(c)}
                        className="text-xs text-blue-600 hover:underline px-2 py-1"
                      >
                        Ред.
                      </button>
                      <button
                        onClick={() => deleteCustomer(c.id)}
                        className="text-gray-400 hover:text-red-500 p-1"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={showForm || !!editCustomer} onOpenChange={(o) => { if (!o) { setShowForm(false); setEditCustomer(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editCustomer ? "Редактировать заказчика" : "Добавить заказчика"}</DialogTitle>
          </DialogHeader>
          <CustomerForm
            initial={editCustomer ?? undefined}
            onSuccess={() => { setShowForm(false); setEditCustomer(null); fetchCustomers(); }}
            onCancel={() => { setShowForm(false); setEditCustomer(null); }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
