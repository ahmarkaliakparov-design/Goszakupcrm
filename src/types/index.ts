import type { PipeStage, Priority, UserRole } from "@prisma/client";

export type { PipeStage, Priority, UserRole };

export const PIPE_STAGE_LABELS: Record<PipeStage, string> = {
  FOUND: "Найден",
  ANALYSIS: "Анализ",
  CALCULATION: "Расчёт",
  SUBMITTED: "Подан",
  WON: "Выиграл",
  LOST: "Проиграл",
  CONTRACT: "Договор",
  DELIVERY: "Отгрузка",
  PAYMENT: "Оплата",
  CLOSED: "Закрыт",
};

export const PIPE_STAGE_COLORS: Record<PipeStage, string> = {
  FOUND: "bg-blue-100 text-blue-800",
  ANALYSIS: "bg-yellow-100 text-yellow-800",
  CALCULATION: "bg-purple-100 text-purple-800",
  SUBMITTED: "bg-orange-100 text-orange-800",
  WON: "bg-green-100 text-green-800",
  LOST: "bg-red-100 text-red-800",
  CONTRACT: "bg-teal-100 text-teal-800",
  DELIVERY: "bg-cyan-100 text-cyan-800",
  PAYMENT: "bg-emerald-100 text-emerald-800",
  CLOSED: "bg-gray-100 text-gray-800",
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  LOW: "Низкий",
  MEDIUM: "Средний",
  HIGH: "Высокий",
};
