import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function GET() {
  const authResult = await requireApiAuth();
  if (!authResult.ok) return authResult.response;
  const { companyId } = authResult;

  const filters = await prisma.savedFilter.findMany({
    where: { companyId },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, filters: true, createdAt: true },
  });

  return NextResponse.json(filters);
}

export async function POST(req: NextRequest) {
  const authResult = await requireApiAuth();
  if (!authResult.ok) return authResult.response;
  const { companyId } = authResult;

  const body = await req.json() as { name?: string; filters?: unknown };
  if (!body.name?.trim() || !body.filters) {
    return NextResponse.json({ error: "name and filters required" }, { status: 400 });
  }

  const saved = await prisma.savedFilter.create({
    data: {
      companyId,
      name: body.name.trim(),
      filters: body.filters as Prisma.InputJsonValue,
    },
    select: { id: true, name: true, filters: true, createdAt: true },
  });

  return NextResponse.json(saved, { status: 201 });
}
