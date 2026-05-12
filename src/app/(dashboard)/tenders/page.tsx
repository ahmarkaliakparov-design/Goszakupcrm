import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Search, Filter, RefreshCw, ExternalLink, Plus } from "lucide-react";

const mockTenders = [
  {
    id: "1",
    name: "Поставка офисной мебели для МИО г. Алматы",
    customer: "Управление образования г. Алматы",
    amount: 8750000,
    deadline: new Date("2026-05-15"),
    method: "Запрос ценовых предложений",
    ktru: "31.01.11.100",
    status: "Опубликован",
    source: "goszakup.gov.kz",
    inPipeline: true,
  },
  {
    id: "2",
    name: "Закупка компьютерного оборудования для школ (ноутбуки, мониторы, периферия)",
    customer: "Управление образования Алматинской области",
    amount: 34200000,
    deadline: new Date("2026-05-20"),
    method: "Тендер",
    ktru: "26.20.11.100",
    status: "Опубликован",
    source: "goszakup.gov.kz",
    inPipeline: true,
  },
  {
    id: "3",
    name: "Услуги по техническому обслуживанию лифтового оборудования",
    customer: "КГП Центральная больница г. Шымкент",
    amount: 3600000,
    deadline: new Date("2026-05-17"),
    method: "Запрос ценовых предложений",
    ktru: "43.21.22.000",
    status: "Опубликован",
    source: "goszakup.gov.kz",
    inPipeline: false,
  },
  {
    id: "4",
    name: "Поставка строительных материалов для ремонта административного здания",
    customer: "ГУ Комитет по строительству РК",
    amount: 56000000,
    deadline: new Date("2026-05-25"),
    method: "Тендер",
    ktru: "23.61.10.110",
    status: "Опубликован",
    source: "goszakup.gov.kz",
    inPipeline: false,
  },
  {
    id: "5",
    name: "Канцелярские товары и расходные материалы для акимата",
    customer: "Акимат г. Нур-Султан",
    amount: 1850000,
    deadline: new Date("2026-05-18"),
    method: "Запрос ценовых предложений",
    ktru: "17.23.13.120",
    status: "Опубликован",
    source: "goszakup.gov.kz",
    inPipeline: true,
  },
];

export default function TendersPage() {
  return (
    <div>
      <Header
        title="Тендеры"
        subtitle="Мониторинг государственных закупок"
        actions={
          <Button size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Обновить
          </Button>
        }
      />

      <div className="p-6 space-y-4">
        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-48">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Поиск по наименованию, заказчику..."
                  className="pl-9"
                />
              </div>
              <Button variant="outline" size="default">
                <Filter className="h-4 w-4 mr-2" />
                Фильтры
              </Button>
              <Button variant="outline" size="default">
                Все источники
              </Button>
              <Button variant="outline" size="default">
                Любая сумма
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tenders table */}
        <Card>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-100">
              {/* Header */}
              <div className="grid grid-cols-12 gap-3 px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide bg-gray-50">
                <div className="col-span-5">Тендер / Заказчик</div>
                <div className="col-span-2 text-right">Сумма</div>
                <div className="col-span-2">Дедлайн</div>
                <div className="col-span-2">Статус</div>
                <div className="col-span-1" />
              </div>

              {mockTenders.map((tender) => (
                <div
                  key={tender.id}
                  className="grid grid-cols-12 gap-3 px-5 py-4 hover:bg-gray-50 transition-colors items-center"
                >
                  <div className="col-span-5">
                    <div className="flex items-start gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 line-clamp-2">{tender.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5 truncate">{tender.customer}</p>
                        <div className="flex gap-2 mt-1">
                          <span className="text-xs text-gray-400">{tender.method}</span>
                          <span className="text-xs text-gray-300">•</span>
                          <span className="text-xs text-gray-400">КТРУ: {tender.ktru}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="col-span-2 text-right">
                    <span className="text-sm font-semibold text-gray-900">
                      {formatCurrency(tender.amount)}
                    </span>
                  </div>

                  <div className="col-span-2">
                    <span className="text-sm text-gray-700">{formatDate(tender.deadline)}</span>
                  </div>

                  <div className="col-span-2">
                    <div className="flex flex-col gap-1">
                      <Badge variant="success">{tender.status}</Badge>
                      {tender.inPipeline && (
                        <Badge variant="secondary">В воронке</Badge>
                      )}
                    </div>
                  </div>

                  <div className="col-span-1 flex items-center justify-end gap-1">
                    {!tender.inPipeline && (
                      <Button variant="ghost" size="icon" title="Добавить в воронку">
                        <Plus className="h-4 w-4" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" title="Открыть на goszakup">
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
              <span>Показано 5 из 5 тендеров</span>
              <span className="text-xs">
                Данные обновлены: 12.05.2026 в 14:32
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
