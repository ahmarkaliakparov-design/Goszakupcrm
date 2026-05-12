import { auth } from "@/lib/auth";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

export default async function SettingsPage() {
  const session = await auth();

  return (
    <div>
      <Header title="Настройки" subtitle="Управление аккаунтом и интеграциями" />

      <div className="p-6 max-w-3xl space-y-6">
        {/* Profile */}
        <Card>
          <CardHeader>
            <CardTitle>Профиль</CardTitle>
            <CardDescription>Информация о вашем аккаунте</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Имя</Label>
                <Input defaultValue={session?.user?.name ?? ""} />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input defaultValue={session?.user?.email ?? ""} type="email" />
              </div>
            </div>
            <Button size="sm">Сохранить</Button>
          </CardContent>
        </Card>

        {/* Company */}
        <Card>
          <CardHeader>
            <CardTitle>Компания</CardTitle>
            <CardDescription>Настройки организации</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Название компании</Label>
                <Input defaultValue="ТОО TenderPro KZ" />
              </div>
              <div className="space-y-1.5">
                <Label>БИН</Label>
                <Input placeholder="123456789012" />
              </div>
            </div>
            <Button size="sm">Сохранить</Button>
          </CardContent>
        </Card>

        {/* goszakup integration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Интеграция с goszakup.gov.kz
              <Badge variant="secondary">Не подключено</Badge>
            </CardTitle>
            <CardDescription>
              Для получения данных в реальном времени необходим API-токен.
              Получите его в личном кабинете на goszakup.gov.kz.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>API-токен goszakup</Label>
              <Input
                type="password"
                placeholder="Вставьте токен из личного кабинета goszakup"
              />
              <p className="text-xs text-gray-500">
                Токен получается в ЛК → Настройки → API-доступ. Токен хранится в зашифрованном виде.
              </p>
            </div>
            <Button size="sm">Подключить</Button>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle>Уведомления</CardTitle>
            <CardDescription>Настройте каналы получения уведомлений</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Telegram Bot Token</Label>
              <div className="flex gap-2">
                <Input placeholder="Токен бота (от @BotFather)" className="flex-1" />
                <Button variant="outline" size="sm">Тест</Button>
              </div>
            </div>
            <Separator />
            <div className="space-y-1.5">
              <Label>Ваш Telegram Chat ID</Label>
              <div className="flex gap-2">
                <Input placeholder="Числовой ID из @userinfobot" className="flex-1" />
              </div>
            </div>
            <Button size="sm">Сохранить</Button>
          </CardContent>
        </Card>

        {/* Keywords */}
        <Card>
          <CardHeader>
            <CardTitle>Ключевые слова мониторинга</CardTitle>
            <CardDescription>
              Тендеры, содержащие эти слова, будут автоматически добавляться для вашего внимания
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {["офисная мебель", "компьютеры", "оргтехника", "канцелярия", "расходные материалы"].map((kw) => (
                <span
                  key={kw}
                  className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-3 py-1 text-sm text-blue-800"
                >
                  {kw}
                  <button className="ml-1 text-blue-400 hover:text-blue-700">×</button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <Input placeholder="Добавить ключевое слово..." className="flex-1" />
              <Button size="sm">Добавить</Button>
            </div>
          </CardContent>
        </Card>

        {/* Security */}
        <Card>
          <CardHeader>
            <CardTitle>Безопасность</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Текущий пароль</Label>
              <Input type="password" placeholder="••••••••" />
            </div>
            <div className="space-y-1.5">
              <Label>Новый пароль</Label>
              <Input type="password" placeholder="••••••••" />
            </div>
            <div className="space-y-1.5">
              <Label>Повторите новый пароль</Label>
              <Input type="password" placeholder="••••••••" />
            </div>
            <Button size="sm" variant="outline">Изменить пароль</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
