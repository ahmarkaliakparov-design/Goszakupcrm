import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";

async function verifyOwnership(taskId: string, companyId: string) {
  const task = await prisma.lotTask.findFirst({
    where: { id: taskId, pipeline: { companyId } },
  });
  return task;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const authResult = await requireApiAuth();
  if (!authResult.ok) return authResult.response;
  const { companyId } = authResult;

  const task = await verifyOwnership(params.id, companyId);
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json() as { done?: boolean; text?: string; dueDate?: string | null };
  const data: { done?: boolean; doneAt?: Date | null; text?: string; dueDate?: Date | null } = {};

  if (typeof body.done === "boolean") {
    data.done = body.done;
    data.doneAt = body.done ? new Date() : null;
  }
  if (typeof body.text === "string" && body.text.trim()) data.text = body.text.trim();
  if (body.dueDate !== undefined) data.dueDate = body.dueDate ? new Date(body.dueDate) : null;

  const updated = await prisma.lotTask.update({ where: { id: params.id }, data });
  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const authResult = await requireApiAuth();
  if (!authResult.ok) return authResult.response;
  const { companyId } = authResult;

  const task = await verifyOwnership(params.id, companyId);
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.lotTask.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
