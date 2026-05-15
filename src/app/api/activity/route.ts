import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const authResult = await requireApiAuth();
  if (!authResult.ok) return authResult.response;
  const { companyId } = authResult;

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [history, comments, tasks, lossRecords, notifications] = await Promise.all([
    prisma.pipelineHistory.findMany({
      where: { pipeline: { companyId }, changedAt: { gte: since } },
      include: { pipeline: { include: { lot: { select: { id: true, name: true } } } } },
      orderBy: { changedAt: "desc" },
      take: 100,
    }),
    prisma.comment.findMany({
      where: { pipeline: { companyId }, createdAt: { gte: since } },
      include: { pipeline: { include: { lot: { select: { id: true, name: true } } } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.lotTask.findMany({
      where: { pipeline: { companyId }, doneAt: { gte: since, not: null } },
      include: { pipeline: { include: { lot: { select: { id: true, name: true } } } } },
      orderBy: { doneAt: "desc" },
      take: 50,
    }),
    prisma.lossRecord.findMany({
      where: { pipeline: { companyId }, createdAt: { gte: since } },
      include: {
        pipeline: { include: { lot: { select: { id: true, name: true } } } },
        competitor: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    prisma.notification.findMany({
      where: { companyId, type: { in: ["NEW_TENDER", "SYSTEM"] }, createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  type Event = {
    id: string;
    type: "stage" | "comment" | "task" | "loss" | "notification";
    timestamp: string;
    title: string;
    detail: string;
    lotId?: string;
    lotName?: string;
  };

  const events: Event[] = [];

  for (const h of history) {
    events.push({
      id: `hist_${h.id}`,
      type: "stage",
      timestamp: h.changedAt.toISOString(),
      title: `Этап: ${h.fromStage ?? "новый"} → ${h.toStage}`,
      detail: h.pipeline.lot.name,
      lotId: h.pipeline.lot.id,
      lotName: h.pipeline.lot.name,
    });
  }

  for (const c of comments) {
    events.push({
      id: `comm_${c.id}`,
      type: "comment",
      timestamp: c.createdAt.toISOString(),
      title: "Новый комментарий",
      detail: c.text.slice(0, 200),
      lotId: c.pipeline.lot.id,
      lotName: c.pipeline.lot.name,
    });
  }

  for (const t of tasks) {
    if (!t.doneAt) continue;
    events.push({
      id: `task_${t.id}`,
      type: "task",
      timestamp: t.doneAt.toISOString(),
      title: "Задача выполнена",
      detail: t.text,
      lotId: t.pipeline.lot.id,
      lotName: t.pipeline.lot.name,
    });
  }

  for (const lr of lossRecords) {
    events.push({
      id: `loss_${lr.id}`,
      type: "loss",
      timestamp: lr.createdAt.toISOString(),
      title: `Проигрыш${lr.competitor ? ` конкуренту ${lr.competitor.name}` : ""}`,
      detail: lr.pipeline.lot.name,
      lotId: lr.pipeline.lot.id,
      lotName: lr.pipeline.lot.name,
    });
  }

  for (const n of notifications) {
    events.push({
      id: `notif_${n.id}`,
      type: "notification",
      timestamp: n.createdAt.toISOString(),
      title: n.title,
      detail: n.body,
    });
  }

  events.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  return NextResponse.json(events.slice(0, 150));
}
