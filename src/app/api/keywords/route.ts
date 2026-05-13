import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export async function GET(req: NextRequest) {
  const authResult = await requireApiAuth();
  if (!authResult.ok) return authResult.response;
  const { companyId } = authResult;

  const keywords = await prisma.keyword.findMany({
    where: { companyId },
    orderBy: { word: "asc" },
  });
  return NextResponse.json(keywords);
}

export async function POST(req: NextRequest) {
  const authResult = await requireApiAuth();
  if (!authResult.ok) return authResult.response;
  const { companyId } = authResult;

  const body = await req.json();
  const word = z.string().min(2).parse(body.word);

  const kw = await prisma.keyword.upsert({
    where: { companyId_word: { companyId, word } },
    create: { companyId, word },
    update: { isActive: true },
  });
  return NextResponse.json(kw, { status: 201 });
}
