"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { X, Plus, RefreshCw } from "lucide-react";

interface SettingsData {
  user: { name: string; email: string; role: string };
  company: { name: string; bin: string | null; settings: Record<string, unknown> };
}

interface Keyword { id: string; word: string; isActive: boolean }

export default function SettingsPage() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [newKeyword, setNewKeyword] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  // Form state
  const [profile, setProfile] = useState({ name: "", email: "" });
  const [company, setCompany] = useState({ name: "", bin: "" });
  const [goszakupToken, setGoszakupToken] = useState("");
  const [telegram, setTelegram] = useState({ botToken: "", chatId: "" });
  const [password, setPassword] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });

  useEffect(() => {
    Promise.all([
      fetch("/api/settings").then((r) => r.json()),
      fetch("/api/keywords").then((r) => r.json()),
    ]).then(([s, kw]) => {
      setSettings(s);
      setProfile({ name: s.user?.name ?? "", email: s.user?.email ?? "" });
      setCompany({ name: s.company?.name ?? "", bin: s.company?.bin ?? "" });
      const cfg = s.company?.settings ?? {};
      setGoszakupToken((cfg.goszakupToken as string) ?? "");
      setTelegram({
        botToken: (cfg.telegramBotToken as string) ?? "",
        chatId: (cfg.telegramChatId as string) ?? "",
      });
      setKeywords(kw);
      setLoading(false);
    });
  }, []);

  async function save(action: string, data: unknown) {
    setSaving(action);
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...data as Record<string, unknown> }),
    });
    const body = await res.json();
    if (res.ok) toast("Сохранено");
    else toast(body.error ?? "Ошибка", "error");
    setSaving(null);
  }

  async function savePassword() {
    if (password.newPassword !== password.confirmPassword) {
      toast("Пароли не совпадают", "error");
      return;
    }
    await save("password", password);
    setPassword({ currentPassword: "", newPassword: "", confirmPassword: "" });
  }

  async function addKeyword() {
    if (!newKeyword.trim()) return;
    const res = await fetch("/api/keywords", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ word: newKeyword.trim().toLowerCase() }),
    });
    if (res.ok) {
      const kw = await res.json();
      setKeywords((prev) => [...prev, kw]);
      setNewKeyword("");
      toast("Ключевое слово добавлено");
    }
  }

  async function deleteKeyword(id: string) {
    await fetch(`/api/keywords/${id}`, { method: "DELETE" });
    setKeywords((prev) => prev.filter((k) => k.id !== id));
  }

  if (loading) {
    return (
      <div>
        <Header title="Настройки" />
        <div className="p-6 flex items-center gap-2 text-gray-400 text-sm">
          <RefreshCw className="h-4 w-4 animate-spin" />Загрузка...
        </div>
      </div>
    );
  }

  const hasGoszakup = !!settings?.company?.settings?.goszakupToken;

  return (
    <div>
      <Header title="Настройки" subtitle="Управление аккаунтом и интеграциями" />

      <div className="p-6 max-w-3xl space-y-6">
        {/* Profile */}
        <Card>
          <CardHeader>
            <CardTitle>Профиль</CardTitle>
            <CardDescription>Ваши личные данные</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Имя</Label>
                <Input value={profile.name} onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" value={profile.email} onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))} />
              </div>
            </div>
            <Button
              size="sm"
              disabled={saving === "profile"}
              onClick={() => save("profile", profile)}
            >
              {saving === "profile" ? "Сохраняем..." : "Сохранить"}
            </Button>
          </CardContent>
        </Card>

        {/* Company */}
        <Card>
          <CardHeader>
            <CardTitle>Компания</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Название</Label>
                <Input value={company.name} onChange={(e) => setCompany((p) => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>БИН</Label>
                <Input
                  placeholder="123456789012"
                  maxLength={12}
                  value={company.bin}
                  onChange={(e) => setCompany((p) => ({ ...p, bin: e.target.value }))}
                />
              </div>
            </div>
            <Button size="sm" disabled={saving === "company"} onClick={() => save("company", company)}>
              {saving === "company" ? "Сохраняем..." : "Сохранить"}
            </Button>
          </CardContent>
        </Card>

        {/* goszakup */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Интеграция goszakup.gov.kz
              <Badge variant={hasGoszakup ? "success" : "secondary"}>
                {hasGoszakup ? "Подключено" : "Не подключено"}
              </Badge>
            </CardTitle>
            <CardDescription>
              API-токен для получения тендеров в реальном времени. Получите в ЛК → API-доступ.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>API-токен</Label>
              <Input
                type="password"
                placeholder="Вставьте токен из личного кабинета"
                value={goszakupToken}
                onChange={(e) => setGoszakupToken(e.target.value)}
              />
            </div>
            <Button
              size="sm"
              disabled={saving === "goszakup" || !goszakupToken}
              onClick={() => save("goszakup", { token: goszakupToken })}
            >
              {saving === "goszakup" ? "Сохраняем..." : "Сохранить токен"}
            </Button>
          </CardContent>
        </Card>

        {/* Keywords */}
        <Card>
          <CardHeader>
            <CardTitle>Ключевые слова мониторинга</CardTitle>
            <CardDescription>
              Тендеры с этими словами будут автоматически отображаться в первую очередь
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2 min-h-8">
              {keywords.map((kw) => (
                <span
                  key={kw.id}
                  className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-3 py-1 text-sm text-blue-800"
                >
                  {kw.word}
                  <button
                    onClick={() => deleteKeyword(kw.id)}
                    className="ml-1 text-blue-400 hover:text-blue-700 rounded-full"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              {keywords.length === 0 && (
                <span className="text-sm text-gray-400">Ключевые слова не добавлены</span>
              )}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Добавить ключевое слово..."
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") addKeyword(); }}
                className="flex-1"
              />
              <Button size="sm" onClick={addKeyword} disabled={!newKeyword.trim()}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Telegram */}
        <Card>
          <CardHeader>
            <CardTitle>Telegram уведомления</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Bot Token (от @BotFather)</Label>
              <Input
                placeholder="1234567890:ABC..."
                value={telegram.botToken}
                onChange={(e) => setTelegram((p) => ({ ...p, botToken: e.target.value }))}
              />
            </div>
            <Separator />
            <div className="space-y-1.5">
              <Label>Ваш Chat ID (из @userinfobot)</Label>
              <Input
                placeholder="123456789"
                value={telegram.chatId}
                onChange={(e) => setTelegram((p) => ({ ...p, chatId: e.target.value }))}
              />
            </div>
            <Button size="sm" disabled={saving === "telegram"} onClick={() => save("telegram", telegram)}>
              {saving === "telegram" ? "Сохраняем..." : "Сохранить"}
            </Button>
          </CardContent>
        </Card>

        {/* Password */}
        <Card>
          <CardHeader>
            <CardTitle>Изменить пароль</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Текущий пароль</Label>
              <Input
                type="password"
                value={password.currentPassword}
                onChange={(e) => setPassword((p) => ({ ...p, currentPassword: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Новый пароль</Label>
                <Input
                  type="password"
                  value={password.newPassword}
                  onChange={(e) => setPassword((p) => ({ ...p, newPassword: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Повторите</Label>
                <Input
                  type="password"
                  value={password.confirmPassword}
                  onChange={(e) => setPassword((p) => ({ ...p, confirmPassword: e.target.value }))}
                />
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={savePassword} disabled={saving === "password"}>
              {saving === "password" ? "Изменяем..." : "Изменить пароль"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
