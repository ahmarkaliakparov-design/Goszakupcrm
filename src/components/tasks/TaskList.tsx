"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Calendar, CheckCircle2, Circle, AlertCircle } from "lucide-react";
import { formatDate, daysUntil } from "@/lib/utils";

interface Task {
  id: string;
  text: string;
  done: boolean;
  dueDate: string | null;
  createdAt: string;
  doneAt: string | null;
}

interface Props {
  pipelineId: string;
}

const PRESET_TASKS = [
  "Изучить ТЗ",
  "Запросить уточнения у заказчика",
  "Подготовить КП от поставщиков",
  "Сделать расчёт стоимости",
  "Подготовить документы",
  "Подать заявку",
  "Подписать договор",
];

export function TaskList({ pipelineId }: Props) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [newText, setNewText] = useState("");
  const [newDate, setNewDate] = useState("");
  const [showPresets, setShowPresets] = useState(false);

  const fetchTasks = useCallback(async () => {
    const res = await fetch(`/api/tasks?pipelineId=${pipelineId}`);
    if (res.ok) {
      const data = await res.json();
      setTasks(data);
    }
    setLoading(false);
  }, [pipelineId]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  async function addTask(text?: string) {
    const taskText = text ?? newText.trim();
    if (!taskText) return;
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pipelineId,
        text: taskText,
        dueDate: newDate || null,
      }),
    });
    if (res.ok) {
      const task = await res.json();
      setTasks((prev) => [...prev, task]);
      setNewText("");
      setNewDate("");
    }
  }

  async function toggleTask(t: Task) {
    const optimistic = { ...t, done: !t.done, doneAt: !t.done ? new Date().toISOString() : null };
    setTasks((prev) => prev.map((x) => (x.id === t.id ? optimistic : x)));
    await fetch(`/api/tasks/${t.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: !t.done }),
    });
  }

  async function deleteTask(id: string) {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    await fetch(`/api/tasks/${id}`, { method: "DELETE" });
  }

  const sorted = [...tasks].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
  const activeCount = tasks.filter((t) => !t.done).length;
  const doneCount = tasks.length - activeCount;

  if (loading) return <div className="text-sm text-gray-400">Загрузка...</div>;

  return (
    <div className="space-y-3">
      {/* Stats */}
      {tasks.length > 0 && (
        <div className="flex items-center gap-4 text-xs text-gray-500 pb-2 border-b border-gray-100">
          <span>Всего: <span className="font-medium text-gray-700">{tasks.length}</span></span>
          <span>Выполнено: <span className="font-medium text-green-600">{doneCount}</span></span>
          <span>Активных: <span className="font-medium text-blue-600">{activeCount}</span></span>
          {tasks.length > 0 && (
            <div className="flex-1 ml-2">
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 transition-all"
                  style={{ width: `${(doneCount / tasks.length) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tasks list */}
      <ul className="space-y-1">
        {sorted.map((task) => {
          const days = task.dueDate && !task.done ? daysUntil(task.dueDate) : null;
          const overdue = days !== null && days < 0;
          const soon = days !== null && days >= 0 && days <= 2;
          return (
            <li
              key={task.id}
              className={`group flex items-start gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors ${
                task.done ? "opacity-50" : ""
              }`}
            >
              <button
                onClick={() => toggleTask(task)}
                className="mt-0.5 shrink-0 hover:scale-110 transition-transform"
                aria-label={task.done ? "Mark as not done" : "Mark as done"}
              >
                {task.done ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <Circle className="h-5 w-5 text-gray-300 hover:text-blue-500" />
                )}
              </button>
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${task.done ? "line-through text-gray-400" : "text-gray-800"}`}>
                  {task.text}
                </p>
                {task.dueDate && (
                  <p className={`text-[11px] mt-0.5 flex items-center gap-1 ${
                    task.done ? "text-gray-400" :
                    overdue ? "text-red-600 font-medium" :
                    soon ? "text-amber-600" :
                    "text-gray-400"
                  }`}>
                    {overdue && <AlertCircle className="h-3 w-3" />}
                    <Calendar className="h-3 w-3" />
                    {formatDate(task.dueDate)}
                    {!task.done && days !== null && (
                      <span className="ml-1">
                        {overdue ? `(просрочено на ${Math.abs(days)} дн.)` :
                         days === 0 ? "(сегодня)" :
                         days === 1 ? "(завтра)" :
                         `(через ${days} дн.)`}
                      </span>
                    )}
                  </p>
                )}
              </div>
              <button
                onClick={() => deleteTask(task.id)}
                className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all p-1"
                aria-label="Delete task"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          );
        })}
        {tasks.length === 0 && (
          <li className="text-center py-6 text-sm text-gray-400">
            Задачи не добавлены. Создайте чек-лист для этого лота.
          </li>
        )}
      </ul>

      {/* Add new */}
      <div className="space-y-2 pt-2 border-t border-gray-100">
        <div className="flex gap-2">
          <Input
            placeholder="Новая задача..."
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") addTask(); }}
            className="flex-1"
          />
          <Input
            type="date"
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
            className="w-40"
            title="Срок выполнения"
          />
          <Button size="sm" onClick={() => addTask()} disabled={!newText.trim()}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {tasks.length === 0 && (
          <div>
            <button
              onClick={() => setShowPresets(!showPresets)}
              className="text-xs text-blue-600 hover:underline"
            >
              {showPresets ? "Скрыть шаблоны" : "Использовать готовый чек-лист →"}
            </button>
            {showPresets && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {PRESET_TASKS.map((t) => (
                  <button
                    key={t}
                    onClick={() => addTask(t)}
                    className="text-xs px-2 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-700 hover:bg-blue-100 transition-colors"
                  >
                    + {t}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
