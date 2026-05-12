import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";
import { Search, Plus, Phone, Mail, Star } from "lucide-react";

const mockSuppliers = [
  {
    id: "1",
    name: "ТОО KazOffice Supply",
    bin: "180340002154",
    category: "Офисные товары",
    contactName: "Алия Нурланова",
    phone: "+7 701 234 5678",
    email: "aiya@kazoffice.kz",
    paymentTerms: "30 дней отсрочка",
    minOrder: 50000,
    deliveryDays: 3,
    rating: 5,
    isActive: true,
    pricesCount: 247,
  },
  {
    id: "2",
    name: "ИП Сейтжанов А.М.",
    bin: "820514350123",
    category: "Компьютерное оборудование",
    contactName: "Асет Сейтжанов",
    phone: "+7 705 987 6543",
    email: "aset@techkz.kz",
    paymentTerms: "50% предоплата",
    minOrder: 200000,
    deliveryDays: 7,
    rating: 4,
    isActive: true,
    pricesCount: 89,
  },
  {
    id: "3",
    name: "ТОО Строй Комплект",
    bin: "091040003421",
    category: "Строительные материалы",
    contactName: "Ержан Бекбосынов",
    phone: "+7 777 456 7890",
    email: "erjan@stroykomplekt.kz",
    paymentTerms: "по факту",
    minOrder: 500000,
    deliveryDays: 5,
    rating: 4,
    isActive: true,
    pricesCount: 412,
  },
  {
    id: "4",
    name: "ТОО MedSupply Kazakhstan",
    bin: "150230005677",
    category: "Медицинское оборудование",
    contactName: "Гульнар Абенова",
    phone: "+7 727 234 8901",
    email: "gulnar@medsupply.kz",
    paymentTerms: "30 дней",
    minOrder: 1000000,
    deliveryDays: 14,
    rating: 3,
    isActive: false,
    pricesCount: 56,
  },
];

export default function SuppliersPage() {
  return (
    <div>
      <Header
        title="Поставщики"
        subtitle="База поставщиков и прайс-листы"
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
                <Input placeholder="Поиск по названию, БИН, категории..." className="pl-9" />
              </div>
              <Button variant="outline">Все категории</Button>
              <Button variant="outline">Активные</Button>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "Всего поставщиков", value: "4" },
            { label: "Активных", value: "3" },
            { label: "Позиций в прайсах", value: "804" },
            { label: "Категорий", value: "4" },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-gray-900">{s.value}</div>
                <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Suppliers grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {mockSuppliers.map((supplier) => (
            <Card key={supplier.id} className={!supplier.isActive ? "opacity-60" : ""}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900 text-sm">{supplier.name}</h3>
                      {!supplier.isActive && (
                        <Badge variant="secondary">Неактивен</Badge>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">БИН: {supplier.bin}</p>
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-3.5 w-3.5 ${i < supplier.rating ? "text-yellow-400 fill-yellow-400" : "text-gray-200"}`}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-3">
                  <Badge variant="outline">{supplier.category}</Badge>
                  <Badge variant="secondary">{supplier.pricesCount} позиций</Badge>
                </div>

                <div className="space-y-1.5 text-xs text-gray-600">
                  <div className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 text-gray-400" />
                    <span>{supplier.contactName} · {supplier.phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 text-gray-400" />
                    <span>{supplier.email}</span>
                  </div>
                </div>

                <div className="flex gap-4 mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
                  <span>От {formatCurrency(supplier.minOrder)}</span>
                  <span>Доставка: {supplier.deliveryDays} дн.</span>
                  <span>{supplier.paymentTerms}</span>
                </div>

                <div className="flex gap-2 mt-3">
                  <Button variant="outline" size="sm" className="flex-1">
                    Прайс-лист
                  </Button>
                  <Button variant="ghost" size="sm" className="flex-1">
                    Редактировать
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
