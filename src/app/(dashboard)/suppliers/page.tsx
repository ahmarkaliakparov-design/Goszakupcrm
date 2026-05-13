"use client";

import { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SupplierForm } from "@/components/suppliers/SupplierForm";
import { PriceListDialog } from "@/components/suppliers/PriceListDialog";
import { useToast } from "@/components/ui/toast";
import { formatCurrency } from "@/lib/utils";
import { Search, Plus, Phone, Mail, Star, Trash2, List, RefreshCw } from "lucide-react";

interface Supplier {
  id: string;
  name: string;
  bin: string | null;
  category: string | null;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  paymentTerms: string | null;
  minOrder: string | null;
  deliveryDays: number | null;
  isActive: boolean;
  _count: { prices: number };
}

export default function SuppliersPage() {
  const { toast } = useToast();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editSupplier, setEditSupplier] = useState<Supplier | null>(null);
  const [priceListSupplier, setPriceListSupplier] = useState<Supplier | null>(null);

  const fetchSuppliers = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/suppliers?search=${encodeURIComponent(search)}&active=all`);
    if (res.ok) setSuppliers(await res.json());
    setLoading(false);
  }, [search]);

  useEffect(() => {
    const t = setTimeout(fetchSuppliers, 300);
    return () => clearTimeout(t);
  }, [fetchSuppliers]);

  async function deleteSupplier(id: string) {
    if (!confirm("Удалить поставщика и все его прайсы?")) return;
    const res = await fetch(`/api/suppliers/${id}`, { method: "DELETE" });
    if (res.ok) { toast("Поставщик удалён"); fetchSuppliers(); }
    else toast("Ошибка удаления", "error");
  }

  async function toggleActive(supplier: Supplier) {
    await fetch(`/api/suppliers/${supplier.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !supplier.isActive }),
    });
    fetchSuppliers();
  }

  const active = suppliers.filter((s) => s.isActive);
  const inactive = suppliers.filter((s) => !s.isActive);

  return (
    <div>
      <Header
        title="Поставщики"
        subtitle={`${active.length} активных`}
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
                  placeholder="Поиск по названию, категории..."
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Button variant="outline" size="sm" onClick={fetchSuppliers}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="text-center py-10 text-gray-400 text-sm">Загрузка...</div>
        ) : suppliers.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-gray-400 text-sm mb-3">Поставщиков ещё нет</p>
            <Button size="sm" onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Добавить первого
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {[...active, ...inactive].map((supplier) => (
              <Card key={supplier.id} className={!supplier.isActive ? "opacity-60" : ""}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-gray-900 text-sm">{supplier.name}</h3>
                        {!supplier.isActive && <Badge variant="secondary">Неактивен</Badge>}
                      </div>
                      {supplier.bin && <p className="text-xs text-gray-400 mt-0.5">БИН: {supplier.bin}</p>}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => { setEditSupplier(supplier); }}
                        className="text-xs text-blue-600 hover:underline px-1"
                      >
                        Ред.
                      </button>
                      <button
                        onClick={() => deleteSupplier(supplier.id)}
                        className="text-gray-400 hover:text-red-500 p-1"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-3">
                    {supplier.category && <Badge variant="outline">{supplier.category}</Badge>}
                    <Badge variant="secondary">{supplier._count.prices} позиций</Badge>
                  </div>

                  <div className="space-y-1 text-xs text-gray-600">
                    {supplier.contactName && (
                      <div className="flex items-center gap-2">
                        {supplier.phone && (
                          <>
                            <Phone className="h-3.5 w-3.5 text-gray-400" />
                            <span>{supplier.contactName} · {supplier.phone}</span>
                          </>
                        )}
                        {!supplier.phone && <span>{supplier.contactName}</span>}
                      </div>
                    )}
                    {supplier.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-3.5 w-3.5 text-gray-400" />
                        <span>{supplier.email}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-4 mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
                    {supplier.minOrder && <span>От {formatCurrency(parseFloat(supplier.minOrder))}</span>}
                    {supplier.deliveryDays && <span>Доставка: {supplier.deliveryDays} дн.</span>}
                    {supplier.paymentTerms && <span>{supplier.paymentTerms}</span>}
                  </div>

                  <div className="flex gap-2 mt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => setPriceListSupplier(supplier)}
                    >
                      <List className="h-3.5 w-3.5 mr-1.5" />
                      Прайс-лист
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleActive(supplier)}
                    >
                      {supplier.isActive ? "Деактив." : "Активировать"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit dialog */}
      <Dialog open={showForm || !!editSupplier} onOpenChange={(open) => { if (!open) { setShowForm(false); setEditSupplier(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editSupplier ? "Редактировать поставщика" : "Добавить поставщика"}</DialogTitle>
          </DialogHeader>
          <SupplierForm
            initialData={editSupplier ? {
              id: editSupplier.id,
              name: editSupplier.name,
              bin: editSupplier.bin ?? "",
              category: editSupplier.category ?? "",
              contactName: editSupplier.contactName ?? "",
              phone: editSupplier.phone ?? "",
              email: editSupplier.email ?? "",
              paymentTerms: editSupplier.paymentTerms ?? "",
              minOrder: editSupplier.minOrder ?? "",
              deliveryDays: editSupplier.deliveryDays?.toString() ?? "",
            } : undefined}
            onSuccess={() => { setShowForm(false); setEditSupplier(null); fetchSuppliers(); }}
            onCancel={() => { setShowForm(false); setEditSupplier(null); }}
          />
        </DialogContent>
      </Dialog>

      {/* Price list dialog */}
      {priceListSupplier && (
        <PriceListDialog
          supplier={priceListSupplier}
          onClose={() => setPriceListSupplier(null)}
        />
      )}
    </div>
  );
}
