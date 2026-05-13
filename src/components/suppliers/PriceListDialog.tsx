"use client";

import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { Plus, Upload, Trash2 } from "lucide-react";

interface Price {
  id: string;
  itemName: string;
  ktru: string | null;
  unit: string | null;
  price: string;
  currency: string;
}

interface PriceListDialogProps {
  supplier: { id: string; name: string };
  onClose: () => void;
}

export function PriceListDialog({ supplier, onClose }: PriceListDialogProps) {
  const { toast } = useToast();
  const [prices, setPrices] = useState<Price[]>([]);
  const [loading, setLoading] = useState(true);
  const [newItem, setNewItem] = useState({ itemName: "", ktru: "", unit: "шт", price: "" });
  const [adding, setAdding] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchPrices();
  }, []);

  async function fetchPrices() {
    const res = await fetch(`/api/suppliers/${supplier.id}`);
    if (res.ok) {
      const data = await res.json();
      setPrices(data.prices ?? []);
    }
    setLoading(false);
  }

  async function addPrice() {
    if (!newItem.itemName || !newItem.price) return;
    setAdding(true);
    const res = await fetch(`/api/suppliers/${supplier.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "add_price",
        itemName: newItem.itemName,
        ktru: newItem.ktru || undefined,
        unit: newItem.unit || "шт",
        price: parseFloat(newItem.price),
      }),
    });
    if (res.ok) {
      toast("Позиция добавлена");
      setNewItem({ itemName: "", ktru: "", unit: "шт", price: "" });
      fetchPrices();
    } else {
      toast("Ошибка добавления", "error");
    }
    setAdding(false);
  }

  async function importExcel(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const { read, utils } = await import("xlsx");
      const buffer = await file.arrayBuffer();
      const wb = read(buffer, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: string[][] = utils.sheet_to_json(ws, { header: 1, defval: "" });

      let imported = 0;
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const itemName = String(row[0] ?? "").trim();
        const price = parseFloat(String(row[1] ?? ""));
        if (!itemName || isNaN(price) || price <= 0) continue;

        await fetch(`/api/suppliers/${supplier.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "add_price",
            itemName,
            ktru: row[2] ? String(row[2]).trim() : undefined,
            unit: row[3] ? String(row[3]).trim() : "шт",
            price,
          }),
        });
        imported++;
      }

      toast(`Импортировано ${imported} позиций`);
      fetchPrices();
    } catch {
      toast("Ошибка импорта Excel", "error");
    }

    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Прайс-лист: {supplier.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Add position */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <p className="text-sm font-medium text-gray-700">Добавить позицию</p>
            <div className="grid grid-cols-4 gap-2">
              <div className="col-span-2 space-y-1">
                <Label className="text-xs">Наименование</Label>
                <Input
                  placeholder="Стул офисный"
                  value={newItem.itemName}
                  onChange={(e) => setNewItem((p) => ({ ...p, itemName: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Единица</Label>
                <Input
                  placeholder="шт"
                  value={newItem.unit}
                  onChange={(e) => setNewItem((p) => ({ ...p, unit: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Цена (₸)</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={newItem.price}
                  onChange={(e) => setNewItem((p) => ({ ...p, price: e.target.value }))}
                  onKeyDown={(e) => { if (e.key === "Enter") addPrice(); }}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={addPrice} disabled={adding || !newItem.itemName || !newItem.price}>
                <Plus className="h-4 w-4 mr-1" />
                Добавить
              </Button>
              <span className="text-xs text-gray-400">или</span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => fileRef.current?.click()}
              >
                <Upload className="h-4 w-4 mr-1" />
                Импорт Excel
              </Button>
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={importExcel} />
              <span className="text-xs text-gray-400">Столбцы: Наименование | Цена | КТРУ | Единица</span>
            </div>
          </div>

          {/* Price list */}
          <div className="max-h-72 overflow-y-auto space-y-1">
            {loading ? (
              <p className="text-sm text-gray-400 text-center py-4">Загрузка...</p>
            ) : prices.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">Прайс-лист пуст</p>
            ) : (
              <>
                <div className="grid grid-cols-12 gap-2 px-2 py-1 text-xs font-medium text-gray-500 uppercase">
                  <div className="col-span-5">Наименование</div>
                  <div className="col-span-2">КТРУ</div>
                  <div className="col-span-2">Единица</div>
                  <div className="col-span-2 text-right">Цена</div>
                  <div className="col-span-1" />
                </div>
                {prices.map((p) => (
                  <div key={p.id} className="grid grid-cols-12 gap-2 px-2 py-1.5 hover:bg-gray-50 rounded items-center text-sm">
                    <div className="col-span-5 truncate">{p.itemName}</div>
                    <div className="col-span-2 text-gray-400 text-xs">{p.ktru ?? "—"}</div>
                    <div className="col-span-2 text-gray-500">{p.unit ?? "шт"}</div>
                    <div className="col-span-2 text-right font-medium">{formatCurrency(parseFloat(p.price))}</div>
                    <div className="col-span-1 flex justify-end">
                      <button className="text-gray-400 hover:text-red-500">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>

          <div className="flex justify-between items-center pt-2 border-t border-gray-100">
            <span className="text-sm text-gray-500">{prices.length} позиций</span>
            <Button variant="outline" onClick={onClose}>Закрыть</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
