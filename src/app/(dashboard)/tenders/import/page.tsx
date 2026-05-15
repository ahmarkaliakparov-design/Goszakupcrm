"use client";

import { useState, useRef } from "react";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, ArrowLeft, Download } from "lucide-react";
import Link from "next/link";

type Step = "upload" | "preview" | "done";

interface PreviewRow {
  name: string;
  customerName: string | null;
  customerBin: string | null;
  totalAmount: number | null;
  deadline: string | null;
  method: string | null;
}

interface PreviewResult {
  total: number;
  mapping: Record<string, string>;
  preview: PreviewRow[];
}

export default function ImportTendersPage() {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [step, setStep] = useState<Step>("upload");
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ created: number; skipped: number } | null>(null);
  const [dragOver, setDragOver] = useState(false);

  async function handleFile(f: File) {
    setFile(f);
    setLoading(true);
    const fd = new FormData();
    fd.append("file", f);
    fd.append("preview", "true");
    const res = await fetch("/api/import/tenders", { method: "POST", body: fd });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      toast(data.error ?? "Ошибка чтения файла", "error");
      return;
    }
    setPreview(data);
    setStep("preview");
  }

  async function runImport() {
    if (!file) return;
    setLoading(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/import/tenders", { method: "POST", body: fd });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      toast(data.error ?? "Ошибка импорта", "error");
      return;
    }
    setResult({ created: data.created, skipped: data.skipped });
    setStep("done");
  }

  const FIELD_LABELS: Record<string, string> = {
    name: "Название", customerName: "Заказчик", customerBin: "БИН",
    totalAmount: "Сумма", deadline: "Дедлайн", method: "Метод", lotName: "Лот",
  };

  return (
    <div>
      <Header
        title="Импорт тендеров"
        subtitle="Загрузите файл Excel (.xlsx) или CSV"
        actions={
          <Link href="/tenders">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1.5" />Назад
            </Button>
          </Link>
        }
      />

      <div className="p-6 max-w-2xl space-y-6">
        {/* Template download */}
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">Шаблон для заполнения</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Скачайте шаблон Excel с нужными колонками
              </p>
            </div>
            <a
              href="/templates/import-template.xlsx"
              download
              onClick={(e) => {
                // Generate template on the fly if file doesn't exist
                e.preventDefault();
                const csv = "Название,Заказчик,БИН заказчика,Сумма,Дедлайн,Метод закупки\nПример тендера,ГККП Больница №1,123456789012,5000000,2026-06-30,Запрос ценовых предложений\n";
                const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "import-template.csv";
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-1.5" />Скачать шаблон
              </Button>
            </a>
          </CardContent>
        </Card>

        {step === "upload" && (
          <Card>
            <CardContent className="p-6">
              <div
                className={`border-2 border-dashed rounded-xl p-12 flex flex-col items-center justify-center cursor-pointer transition-colors ${
                  dragOver ? "border-blue-400 bg-blue-50" : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                }`}
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  const f = e.dataTransfer.files[0];
                  if (f) handleFile(f);
                }}
              >
                {loading ? (
                  <>
                    <div className="animate-spin h-10 w-10 border-4 border-blue-200 border-t-blue-500 rounded-full mb-4" />
                    <p className="text-sm text-gray-500">Читаем файл...</p>
                  </>
                ) : (
                  <>
                    <FileSpreadsheet className="h-14 w-14 text-gray-300 mb-4" />
                    <p className="text-base font-medium text-gray-700 mb-1">
                      Перетащите файл сюда или кликните
                    </p>
                    <p className="text-sm text-gray-400">
                      Поддерживаемые форматы: .xlsx, .xls, .csv
                    </p>
                  </>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }}
              />
            </CardContent>
          </Card>
        )}

        {step === "preview" && preview && (
          <div className="space-y-4">
            {/* Column mapping */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  Найдено {preview.total} записей
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-gray-600">Распознанные колонки:</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(preview.mapping).map(([original, key]) => (
                    <span key={original} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-50 border border-green-200 rounded-full text-xs text-green-700">
                      <CheckCircle2 className="h-3 w-3" />
                      <span className="font-mono text-[10px] text-green-500">{original}</span>
                      <span>→</span>
                      <span className="font-medium">{FIELD_LABELS[key] ?? key}</span>
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Preview table */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Предпросмотр (первые 5 строк)</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        <th className="text-left px-4 py-2.5 font-medium text-gray-600">Название</th>
                        <th className="text-left px-4 py-2.5 font-medium text-gray-600">Заказчик</th>
                        <th className="text-right px-4 py-2.5 font-medium text-gray-600">Сумма</th>
                        <th className="text-left px-4 py-2.5 font-medium text-gray-600">Дедлайн</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {preview.preview.map((row, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-4 py-2.5 text-gray-900 max-w-[200px] truncate">{row.name}</td>
                          <td className="px-4 py-2.5 text-gray-500">{row.customerName ?? "—"}</td>
                          <td className="px-4 py-2.5 text-right text-gray-700">
                            {row.totalAmount ? row.totalAmount.toLocaleString("ru-KZ") + " ₸" : "—"}
                          </td>
                          <td className="px-4 py-2.5 text-gray-500">
                            {row.deadline ? new Date(row.deadline).toLocaleDateString("ru-KZ") : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => { setStep("upload"); setPreview(null); setFile(null); }}>
                Выбрать другой файл
              </Button>
              <Button onClick={runImport} disabled={loading}>
                {loading ? (
                  <><div className="h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />Импортируем...</>
                ) : (
                  <><Upload className="h-4 w-4 mr-1.5" />Импортировать {preview.total} тендеров</>
                )}
              </Button>
            </div>
          </div>
        )}

        {step === "done" && result && (
          <Card>
            <CardContent className="py-12 text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle2 className="h-9 w-9 text-green-500" />
              </div>
              <div>
                <p className="text-xl font-semibold text-gray-900">Импорт завершён!</p>
                <p className="text-gray-500 mt-1">
                  Создано: <span className="font-semibold text-gray-900">{result.created}</span> тендеров
                  {result.skipped > 0 && (
                    <span className="ml-2 text-amber-600">
                      <AlertCircle className="inline h-3.5 w-3.5 mr-0.5" />
                      {result.skipped} пропущено
                    </span>
                  )}
                </p>
              </div>
              <div className="flex gap-3 justify-center">
                <Link href="/tenders">
                  <Button>Перейти к тендерам</Button>
                </Link>
                <Button
                  variant="outline"
                  onClick={() => { setStep("upload"); setPreview(null); setFile(null); setResult(null); }}
                >
                  Ещё один импорт
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Instructions */}
        {step === "upload" && (
          <Card>
            <CardContent className="p-5">
              <p className="text-sm font-medium text-gray-700 mb-3">Требования к файлу:</p>
              <ul className="text-sm text-gray-500 space-y-1.5 list-none">
                {[
                  "Первая строка должна содержать заголовки колонок",
                  'Обязательная колонка: «Название» (или «Тендер», «Наименование»)',
                  "Необязательно: Заказчик, БИН заказчика, Сумма, Дедлайн, Метод закупки",
                  "Дедлайн в формате ГГГГ-ММ-ДД или ДД.ММ.ГГГГ",
                  "Суммы без пробелов, только цифры",
                ].map((t, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 text-[11px] flex items-center justify-center shrink-0 font-semibold mt-0.5">{i + 1}</span>
                    {t}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
