import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, MapPin, Clock, TrendingUp } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

const mockCustomers = [
  {
    id: "1",
    name: "Управление образования г. Алматы",
    bin: "991040005678",
    region: "Алматы",
    category: "Образование",
    paymentDays: 45,
    rating: 5,
    isBlacklist: false,
    tendersTotal: 12,
    tendersWon: 3,
    totalVolume: 48750000,
  },
  {
    id: "2",
    name: "Акимат г. Нур-Султан",
    bin: "040340001234",
    region: "Астана",
    category: "Государственное управление",
    paymentDays: 30,
    rating: 4,
    isBlacklist: false,
    tendersTotal: 5,
    tendersWon: 2,
    totalVolume: 12400000,
  },
  {
    id: "3",
    name: "ГКП Центральная районная больница",
    bin: "010540007890",
    region: "Алматинская область",
    category: "Здравоохранение",
    paymentDays: 60,
    rating: 3,
    isBlacklist: false,
    tendersTotal: 8,
    tendersWon: 1,
    totalVolume: 12400000,
  },
  {
    id: "4",
    name: "ГУ Комитет по строительству РК",
    bin: "020340009012",
    region: "Астана",
    category: "Строительство",
    paymentDays: 90,
    rating: 2,
    isBlacklist: false,
    tendersTotal: 3,
    tendersWon: 0,
    totalVolume: 0,
  },
];

const ratingColors = ["", "text-red-500", "text-orange-500", "text-yellow-500", "text-blue-500", "text-green-500"];
const ratingLabels = ["", "Проблемный", "Ниже среднего", "Средний", "Хороший", "Отличный"];

export default function CustomersPage() {
  return (
    <div>
      <Header
        title="Заказчики"
        subtitle="База государственных заказчиков"
        actions={
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Добавить
          </Button>
        }
      />

      <div className="p-6 space-y-4">
        {/* Search */}
        <Card>
          <CardContent className="p-4">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input placeholder="Поиск по названию, БИН..." className="pl-9" />
              </div>
              <Button variant="outline">Все регионы</Button>
              <Button variant="outline">Все категории</Button>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-100">
              <div className="grid grid-cols-12 gap-3 px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide bg-gray-50">
                <div className="col-span-4">Заказчик</div>
                <div className="col-span-2">Регион</div>
                <div className="col-span-2">Оплата</div>
                <div className="col-span-2">Участий / Побед</div>
                <div className="col-span-2">Общий объём</div>
              </div>

              {mockCustomers.map((c) => (
                <div
                  key={c.id}
                  className="grid grid-cols-12 gap-3 px-5 py-4 hover:bg-gray-50 transition-colors items-center cursor-pointer"
                >
                  <div className="col-span-4">
                    <p className="text-sm font-medium text-gray-900">{c.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-xs text-gray-400">БИН: {c.bin}</p>
                      <Badge variant="outline" className="text-xs">{c.category}</Badge>
                    </div>
                    {c.isBlacklist && (
                      <Badge variant="destructive" className="mt-1">Чёрный список</Badge>
                    )}
                  </div>

                  <div className="col-span-2">
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <MapPin className="h-3.5 w-3.5 text-gray-400" />
                      {c.region}
                    </div>
                  </div>

                  <div className="col-span-2">
                    <div className="flex items-center gap-1 text-sm">
                      <Clock className="h-3.5 w-3.5 text-gray-400" />
                      <span className={c.paymentDays > 60 ? "text-red-600" : "text-gray-700"}>
                        {c.paymentDays} дней
                      </span>
                    </div>
                  </div>

                  <div className="col-span-2">
                    <div className="flex items-center gap-1 text-sm text-gray-700">
                      <TrendingUp className="h-3.5 w-3.5 text-gray-400" />
                      {c.tendersTotal} / {c.tendersWon}
                      <span className="text-xs text-gray-400">
                        ({c.tendersTotal > 0 ? Math.round((c.tendersWon / c.tendersTotal) * 100) : 0}%)
                      </span>
                    </div>
                  </div>

                  <div className="col-span-2">
                    <div className="text-sm font-medium text-gray-900">
                      {formatCurrency(c.totalVolume)}
                    </div>
                    <div className={`text-xs ${ratingColors[c.rating]}`}>
                      {ratingLabels[c.rating]}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
