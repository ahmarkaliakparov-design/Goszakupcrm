import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";

// POST: create new task on a pipeline
export async function POST(req: NextRequest) {
  const authResult = await requireApiAuth();
  if (!authResult.ok) return authResult.response;
  const { companyId } = authResult;

  const body = await req.json() as { pipelineId?: string; text?: string; dueDate?: string };
  if (!body.pipelineId || !body.text?.trim()) {
    return NextResponse.json({ error: "pipelineId and text required" }, { status: 400 });
  }

  // Verify ownership
  const pipeline = await prisma.lotPipeline.findFirst({
    where: { id: body.pipelineId, companyId },
    select: { id: true },
  });
  if (!pipeline) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Get max position
  const last = await prisma.lotTask.findFirst({
    where: { pipelineId: body.pipelineId },
    orderBy: { position: "desc" },
    select: { position: true },
  });

  const task = await prisma.lotTask.create({
    data: {
      pipelineId: body.pipelineId,
      text: body.text.trim(),
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      position: (last?.position ?? 0) + 1,
    },
  });

  return NextResponse.json(task, { status: 201 });
}

// GET: list tasks for pipeline (?pipelineId=...)
export async function GET(req: NextRequest) {
  const authResult = await requireApiAuth();
  if (!authResult.ok) return authResult.response;
  const { companyId } = authResult;

  const pipelineId = req.nextUrl.searchParams.get("pipelineId");
  if (!pipelineId) return NextResponse.json({ error: "pipelineId required" }, { status: 400 });

  const pipeline = await prisma.lotPipeline.findFirst({
    where: { id: pipelineId, companyId },
    select: { id: true },
  });
  if (!pipeline) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const tasks = await prisma.lotTask.findMany({
    where: { pipelineId },
    orderBy: [{ done: "asc" }, { position: "asc" }],
  });

  return NextResponse.json(tasks);
}
