"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter, X, ChevronDown, Bookmark, BookmarkCheck, Trash2 } from "lucide-react";

export interface TenderFiltersState {
  search: string;
  minAmount: string;
  maxAmount: string;
  method: string;
  source: string;
  deadlineFrom: string;
  deadlineTo: string;
  inPipeline: string;
  sortBy: string;
  sortDir: "asc" | "desc";
}

export const DEFAULT_FILTERS: TenderFiltersState = {
  search: "",
  minAmount: "",
  maxAmount: "",
  method: "",
  source: "",
  deadlineFrom: "",
  deadlineTo: "",
  inPipeline: "",
  sortBy: "createdAt",
  sortDir: "desc",
};

interface SavedFilter {
  id: string;
  name: string;
  filters: unknown;
  createdAt: string;
}

interface Props {
  value: TenderFiltersState;
  onChange: (v: TenderFiltersState) => void;
}

export function TenderFilters({ value, onChange }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/saved-filters")
      .then((r) => r.json())
      .then(setSavedFilters)
      .catch(() => {});
  }, []);

  const activeCount = [
    value.minAmount, value.maxAmount, value.method, value.source,
    value.deadlineFrom, value.deadlineTo, value.inPipeline,
  ].filter(Boolean).length;

  function update<K extends keyof TenderFiltersState>(field: K, v: TenderFiltersState[K]) {
    onChange({ ...value, [field]: v });
  }

  function reset() {
    onChange({ ...DEFAULT_FILTERS, search: value.search });
  }

  async function saveFilter() {
    if (!saveName.trim()) return;
    setSaving(true);
    const { search: _s, ...filtersWithoutSearch } = value;
    const res = await fetch("/api/saved-filters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: saveName.trim(), filters: filtersWithoutSearch }),
    });
    if (res.ok) {
      const saved: SavedFilter = await res.json();
      setSavedFilters((prev) => [saved, ...prev]);
      setSaveName("");
      setSaveDialogOpen(false);
    }
    setSaving(false);
  }

  async function deleteFilter(id: string) {
    await fetch(`/api/saved-filters/${id}`, { method: "DELETE" });
    setSavedFilters((prev) => prev.filter((f) => f.id !== id));
  }

  function applyFilter(sf: SavedFilter) {
    const f = sf.filters as Partial<TenderFiltersState>;
    onChange({ ...DEFAULT_FILTERS, search: value.search, ...f });
  }

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex gap-2 flex-wrap items-center">
          <Input
            placeholder="🔍  Поиск по названию, заказчику, БИН..."
            value={value.search}
            onChange={(e) => update("search", e.target.value)}
            className="flex-1 min-w-[280px]"
          />
          <Select value={value.sortBy} onValueChange={(v) => update("sortBy", v)}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Сортировка" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="createdAt">Сначала новые</SelectItem>
              <SelectItem value="deadline">По дедлайну</SelectItem>
              <SelectItem value="totalAmount">По сумме</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className={activeCount > 0 ? "border-blue-300 text-blue-700" : ""}
          >
            <Filter className="h-4 w-4 mr-1.5" />
            Фильтры
            {activeCount > 0 && (
              <span className="ml-1.5 bg-blue-600 text-white rounded-full px-1.5 py-0.5 text-[10px] font-semibold">
                {activeCount}
              </span>
            )}
            <ChevronDown className={`h-3.5 w-3.5 ml-1 transition-transform ${expanded ? "rotate-180" : ""}`} />
          </Button>
          {activeCount > 0 && (
            <>
              <Button variant="ghost" size="sm" onClick={reset}>
                <X className="h-3.5 w-3.5 mr-1" />Сбросить
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSaveDialogOpen(!saveDialogOpen)}
                title="Сохранить фильтр"
              >
                <Bookmark className="h-4 w-4" />
              </Button>
            </>
          )}
          {savedFilters.length > 0 && (
            <div className="flex gap-1 flex-wrap">
              {savedFilters.map((sf) => (
                <div key={sf.id} className="flex items-center gap-0.5">
                  <button
                    onClick={() => applyFilter(sf)}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 transition-colors"
                  >
                    <BookmarkCheck className="h-3 w-3" />
                    {sf.name}
                  </button>
                  <button
                    onClick={() => deleteFilter(sf.id)}
                    className="text-gray-300 hover:text-red-400 transition-colors p-0.5"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {saveDialogOpen && (
          <div className="flex gap-2 items-center p-3 bg-blue-50 rounded-lg border border-blue-200">
            <Bookmark className="h-4 w-4 text-blue-500 shrink-0" />
            <Input
              placeholder="Название фильтра..."
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") saveFilter(); }}
              className="h-8 bg-white"
              autoFocus
            />
            <Button size="sm" onClick={saveFilter} disabled={saving || !saveName.trim()}>
              {saving ? "..." : "Сохранить"}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSaveDialogOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        {expanded && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-3 border-t border-gray-100">
            <div className="space-y-1">
              <Label className="text-xs">Сумма от, ₸</Label>
              <Input
                type="number"
                placeholder="0"
                value={value.minAmount}
                onChange={(e) => update("minAmount", e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Сумма до, ₸</Label>
              <Input
                type="number"
                placeholder="∞"
                value={value.maxAmount}
                onChange={(e) => update("maxAmount", e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Дедлайн с</Label>
              <Input
                type="date"
                value={value.deadlineFrom}
                onChange={(e) => update("deadlineFrom", e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Дедлайн до</Label>
              <Input
                type="date"
                value={value.deadlineTo}
                onChange={(e) => update("deadlineTo", e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Метод закупки</Label>
              <Input
                placeholder="Конкурс, ЗЦП..."
                value={value.method}
                onChange={(e) => update("method", e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Источник</Label>
              <Select value={value.source || "all"} onValueChange={(v) => update("source", v === "all" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Все" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все источники</SelectItem>
                  <SelectItem value="GOSZAKUP">goszakup.gov.kz</SelectItem>
                  <SelectItem value="SAMRUK">Самрук-Казына</SelectItem>
                  <SelectItem value="MITWORK">MITWORK</SelectItem>
                  <SelectItem value="OTHER">Вручную</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">В воронке</Label>
              <Select value={value.inPipeline || "any"} onValueChange={(v) => update("inPipeline", v === "any" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Не важно" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Не важно</SelectItem>
                  <SelectItem value="yes">Уже в воронке</SelectItem>
                  <SelectItem value="no">Не добавлены</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Направление</Label>
              <Select value={value.sortDir} onValueChange={(v) => update("sortDir", v as "asc" | "desc")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="desc">По убыванию</SelectItem>
                  <SelectItem value="asc">По возрастанию</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
