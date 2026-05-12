import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { PIPE_STAGE_LABELS } from "@/types";
import type { PipeStage } from "@/types";
import { MoreHorizontal, Clock } from "lucide-react";

type KanbanLot = {
  id: string;
  name: string;
  customer: string;
  amount: number;
  deadline: string;
  priority: "LOW" | "MEDIUM" | "HIGH";
  daysLeft: number;
};

const pipelineData: Record<PipeStage, KanbanLot[]> = {
  FOUND: [
    {
      id: "f1",
      name: "Поставка строительных материалов",
      customer: "ГУ Комитет по строительству",
      amount: 56000000,
      deadline: "25.05.2026",
      priority: "HIGH",
      daysLeft: 13,
    },
    {
      id: "f2",
      name: "Услуги охраны периметра объекта",
      customer: "АО Казатомпром",
      amount: 8400000,
      deadline: "28.05.2026",
      priority: "LOW",
      daysLeft: 16,
    },
  ],
  ANALYSIS: [
    {
      id: "a1",
      name: "Офисная мебель для МИО г. Алматы",
      customer: "Управление образования г. Алматы",
      amount: 8750000,
      deadline: "15.05.2026",
      priority: "HIGH",
      daysLeft: 3,
    },
    {
      id: "a2",
      name: "Дезинфицирующие средства для больниц",
      customer: "ДСЭК г. Алматы",
      amount: 4200000,
      deadline: "22.05.2026",
      priority: "MEDIUM",
      daysLeft: 10,
    },
  ],
  CALCULATION: [
    {
      id: "c1",
      name: "Компьютерное оборудование для школ",
      customer: "УО Алматинской области",
      amount: 34200000,
      deadline: "20.05.2026",
      priority: "HIGH",
      daysLeft: 8,
    },
  ],
  SUBMITTED: [
    {
      id: "s1",
      name: "Канцелярские товары для акимата",
      customer: "Акимат г. Нур-Султан",
      amount: 1850000,
      deadline: "18.05.2026",
      priority: "MEDIUM",
      daysLeft: 6,
    },
    {
      id: "s2",
      name: "Спецодежда и СИЗ для рабочих",
      customer: "ГКП Водоканал",
      amount: 5700000,
      deadline: "19.05.2026",
      priority: "MEDIUM",
      daysLeft: 7,
    },
  ],
  WON: [
    {
      id: "w1",
      name: "Медицинское оборудование для ЦРБ",
      customer: "ГКП ЦРБ Алматинской обл.",
      amount: 12400000,
      deadline: "12.05.2026",
      priority: "HIGH",
      daysLeft: 0,
    },
  ],
  LOST: [],
  CONTRACT: [],
  DELIVERY: [],
  PAYMENT: [],
  CLOSED: [],
};

const priorityColors = {
  LOW: "bg-gray-200",
  MEDIUM: "bg-yellow-400",
  HIGH: "bg-red-500",
};

const activeStages: PipeStage[] = ["FOUND", "ANALYSIS", "CALCULATION", "SUBMITTED", "WON"];

export default function PipelinePage() {
  return (
    <div className="flex flex-col h-full">
      <Header
        title="Воронка"
        subtitle="Управление лотами по статусам"
        actions={
          <Button size="sm" variant="outline">
            Архив
          </Button>
        }
      />

      <div className="flex-1 overflow-x-auto p-6">
        <div className="flex gap-4 min-w-max">
          {activeStages.map((stage) => {
            const lots = pipelineData[stage] ?? [];
            const total = lots.reduce((sum, l) => sum + l.amount, 0);
            return (
              <div key={stage} className="w-72 flex flex-col">
                {/* Column header */}
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <span className="text-sm font-semibold text-gray-900">
                      {PIPE_STAGE_LABELS[stage]}
                    </span>
                    <span className="ml-2 text-xs text-gray-400">{lots.length}</span>
                  </div>
                  <span className="text-xs text-gray-500 font-medium">
                    {formatCurrency(total)}
                  </span>
                </div>

                {/* Cards */}
                <div className="space-y-2.5">
                  {lots.map((lot) => (
                    <Card
                      key={lot.id}
                      className="cursor-pointer hover:shadow-md transition-shadow"
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <p className="text-sm font-medium text-gray-900 line-clamp-2 flex-1">
                            {lot.name}
                          </p>
                          <button className="text-gray-400 hover:text-gray-600 shrink-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                        </div>

                        <p className="text-xs text-gray-500 truncate mb-3">{lot.customer}</p>

                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-gray-900">
                            {formatCurrency(lot.amount)}
                          </span>
                          <div className="flex items-center gap-1">
                            <div
                              className={`w-2 h-2 rounded-full ${priorityColors[lot.priority]}`}
                              title={lot.priority}
                            />
                          </div>
                        </div>

                        <div className={`flex items-center gap-1 mt-2 text-xs ${lot.daysLeft <= 3 ? "text-red-600" : "text-gray-400"}`}>
                          <Clock className="h-3 w-3" />
                          {lot.deadline}
                          {lot.daysLeft > 0 && (
                            <span>({lot.daysLeft} дн.)</span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {lots.length === 0 && (
                    <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center">
                      <p className="text-xs text-gray-400">Нет лотов</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
