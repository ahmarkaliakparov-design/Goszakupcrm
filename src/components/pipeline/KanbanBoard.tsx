"use client";

import { useState, useCallback } from "react";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { formatCurrency, formatDate, daysUntil } from "@/lib/utils";
import { PIPE_STAGE_LABELS } from "@/types";
import type { PipeStage } from "@/types";
import { Clock, MessageSquare, GripVertical, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import Link from "next/link";
import { LossModal } from "@/components/pipeline/LossModal";

export interface PipelineLot {
  id: string;
  stage: PipeStage;
  priority: "LOW" | "MEDIUM" | "HIGH";
  notes: string | null;
  lot: {
    id: string;
    name: string;
    totalPrice: string | null;
    tender: {
      name: string;
      customerName: string | null;
      deadline: string | null;
    };
  };
  comments: { id: string; text: string }[];
}

interface KanbanBoardProps {
  initialData: Record<PipeStage, PipelineLot[]>;
  onUpdate?: () => void;
}

const ACTIVE_STAGES: PipeStage[] = ["FOUND", "ANALYSIS", "CALCULATION", "SUBMITTED", "WON", "LOST"];

const stageColors: Record<PipeStage, string> = {
  FOUND: "border-t-blue-400",
  ANALYSIS: "border-t-yellow-400",
  CALCULATION: "border-t-purple-400",
  SUBMITTED: "border-t-orange-400",
  WON: "border-t-green-500",
  LOST: "border-t-red-400",
  CONTRACT: "border-t-teal-400",
  DELIVERY: "border-t-cyan-400",
  PAYMENT: "border-t-emerald-400",
  CLOSED: "border-t-gray-400",
};

const priorityDot: Record<string, string> = {
  LOW: "bg-gray-300",
  MEDIUM: "bg-yellow-400",
  HIGH: "bg-red-500",
};

function LotCard({ pipeline, isDragging }: { pipeline: PipelineLot; isDragging?: boolean }) {
  const daysLeft = daysUntil(pipeline.lot.tender.deadline);
  const isUrgent = daysLeft !== null && daysLeft <= 3 && daysLeft >= 0;
  const isExpired = daysLeft !== null && daysLeft < 0;

  return (
    <div className={cn(
      "bg-white rounded-lg border border-gray-200 p-3.5 space-y-2",
      isDragging ? "shadow-xl rotate-1 opacity-90" : "shadow-sm hover:shadow-md transition-shadow",
    )}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-gray-900 line-clamp-2 flex-1 leading-snug">
          {pipeline.lot.name}
        </p>
        <div className={`w-2 h-2 rounded-full mt-1 shrink-0 ${priorityDot[pipeline.priority]}`} />
      </div>

      <p className="text-xs text-gray-500 truncate">{pipeline.lot.tender.customerName ?? pipeline.lot.tender.name}</p>

      {pipeline.lot.totalPrice && (
        <p className="text-sm font-bold text-gray-900">{formatCurrency(parseFloat(pipeline.lot.totalPrice))}</p>
      )}

      <div className="flex items-center justify-between text-xs">
        {pipeline.lot.tender.deadline ? (
          <span className={cn(
            "flex items-center gap-1",
            isExpired ? "text-red-600" : isUrgent ? "text-orange-500" : "text-gray-400",
          )}>
            <Clock className="h-3 w-3" />
            {formatDate(pipeline.lot.tender.deadline)}
            {daysLeft !== null && daysLeft >= 0 && ` (${daysLeft} д.)`}
            {isExpired && " истёк"}
          </span>
        ) : <span />}

        <div className="flex items-center gap-2 text-gray-400">
          {pipeline.comments.length > 0 && (
            <span className="flex items-center gap-0.5">
              <MessageSquare className="h-3 w-3" />
              {pipeline.comments.length}
            </span>
          )}
          <Link
            href={`/lots/${pipeline.lot.id}`}
            className="hover:text-blue-600 transition-colors"
            onClick={(e) => e.stopPropagation()}
            title="Открыть лот"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}

function SortableLotCard({ pipeline }: { pipeline: PipelineLot }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: pipeline.id,
    data: { stage: pipeline.stage, pipeline },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <div className="relative group">
        <div
          {...attributes}
          {...listeners}
          className="absolute -left-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing transition-opacity"
        >
          <GripVertical className="h-4 w-4 text-gray-400" />
        </div>
        <LotCard pipeline={pipeline} />
      </div>
    </div>
  );
}

export function KanbanBoard({ initialData, onUpdate }: KanbanBoardProps) {
  const { toast } = useToast();
  const [data, setData] = useState<Record<PipeStage, PipelineLot[]>>(initialData);
  const [activePipeline, setActivePipeline] = useState<PipelineLot | null>(null);
  const [lossModalState, setLossModalState] = useState<{ pipelineId: string; lotName: string; submittedPrice: number | null } | null>(null);
  const [pendingLossPipeline, setPendingLossPipeline] = useState<PipelineLot | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const pipeline = event.active.data.current?.pipeline as PipelineLot;
    setActivePipeline(pipeline);
  }, []);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    setActivePipeline(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const fromPipeline = active.data.current?.pipeline as PipelineLot;
    const fromStage = fromPipeline.stage;
    const toStage = (over.data.current?.stage ?? over.id) as PipeStage;

    if (fromStage === toStage) return;

    // If transitioning TO LOST — open modal to capture competitor data
    if (toStage === "LOST") {
      setPendingLossPipeline(fromPipeline);
      setLossModalState({
        pipelineId: fromPipeline.id,
        lotName: fromPipeline.lot.name,
        submittedPrice: fromPipeline.lot.totalPrice ? parseFloat(fromPipeline.lot.totalPrice) : null,
      });
      return;
    }

    // Optimistic update
    setData((prev) => {
      const newData = { ...prev };
      newData[fromStage] = prev[fromStage].filter((p) => p.id !== fromPipeline.id);
      const updated = { ...fromPipeline, stage: toStage };
      newData[toStage] = [updated, ...prev[toStage]];
      return newData;
    });

    try {
      const res = await fetch(`/api/pipeline/${fromPipeline.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: toStage }),
      });

      if (!res.ok) throw new Error();
      toast(`Перемещён в "${PIPE_STAGE_LABELS[toStage]}"`);
      onUpdate?.();
    } catch {
      setData(initialData);
      toast("Ошибка при перемещении", "error");
    }
  }, [initialData, onUpdate, toast]);

  function handleLossSuccess() {
    if (!pendingLossPipeline) return;
    const p = pendingLossPipeline;
    setData((prev) => {
      const newData = { ...prev };
      newData[p.stage] = prev[p.stage].filter((x) => x.id !== p.id);
      newData.LOST = [{ ...p, stage: "LOST" }, ...prev.LOST];
      return newData;
    });
    setPendingLossPipeline(null);
    onUpdate?.();
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 min-w-max">
          {ACTIVE_STAGES.map((stage) => {
            const lots = data[stage] ?? [];
            const totalAmount = lots.reduce((sum, p) => sum + (p.lot.totalPrice ? parseFloat(p.lot.totalPrice) : 0), 0);

            return (
              <DroppableColumn key={stage} stage={stage} lots={lots} totalAmount={totalAmount} />
            );
          })}
        </div>

        <DragOverlay>
          {activePipeline && <LotCard pipeline={activePipeline} isDragging />}
        </DragOverlay>
      </DndContext>

      <LossModal
        open={!!lossModalState}
        pipelineId={lossModalState?.pipelineId ?? null}
        lotName={lossModalState?.lotName}
        ourSubmittedPrice={lossModalState?.submittedPrice}
        onClose={() => { setLossModalState(null); setPendingLossPipeline(null); }}
        onSuccess={handleLossSuccess}
      />
    </>
  );
}

function DroppableColumn({ stage, lots, totalAmount }: {
  stage: PipeStage;
  lots: PipelineLot[];
  totalAmount: number;
}) {
  const { setNodeRef, isOver } = useSortable({
    id: stage,
    data: { stage },
    disabled: true,
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "w-72 flex flex-col border-t-2 rounded-t-sm bg-gray-50/50",
        stageColors[stage],
        isOver && "ring-2 ring-blue-300 ring-offset-2",
      )}
    >
      <div className="flex items-center justify-between px-3 py-2.5">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-800">{PIPE_STAGE_LABELS[stage]}</span>
          <span className="text-xs text-gray-400 bg-gray-200 rounded-full px-2 py-0.5">{lots.length}</span>
        </div>
        {totalAmount > 0 && (
          <span className="text-xs text-gray-500 font-medium">{formatCurrency(totalAmount)}</span>
        )}
      </div>

      <SortableContext items={lots.map((l) => l.id)} strategy={verticalListSortingStrategy} id={stage}>
        <div className="flex-1 p-2 space-y-2.5 min-h-[200px]">
          {lots.map((pipeline) => (
            <SortableLotCard key={pipeline.id} pipeline={pipeline} />
          ))}
          {lots.length === 0 && (
            <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center">
              <p className="text-xs text-gray-400">Перетащите сюда</p>
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}
