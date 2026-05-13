import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(2),
  bin: z.string().min(12).max(12),
  region: z.string().optional(),
  category: z.string().optional(),
  paymentDays: z.number().int().min(0).optional(),
  rating: z.number().int().min(1).max(5).optional(),
  notes: z.string().optional(),
  isBlacklist: z.boolean().optional(),
});

export async function GET(req: NextRequest) {
  const authResult = await requireApiAuth();
  if (!authResult.ok) return authResult.response;
  const { companyId } = authResult;

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? "";

  const customers = await prisma.customer.findMany({
    where: {
      companyId,
      ...(search ? {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { bin: { contains: search } },
        ],
      } : {}),
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(customers);
}

export async function POST(req: NextRequest) {
  const authResult = await requireApiAuth();
  if (!authResult.ok) return authResult.response;
  const { companyId } = authResult;

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation error", details: parsed.error.issues }, { status: 400 });

  const customer = await prisma.customer.create({
    data: { ...parsed.data, companyId },
  });

  return NextResponse.json(customer, { status: 201 });
}
