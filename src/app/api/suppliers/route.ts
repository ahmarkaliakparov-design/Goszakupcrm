import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(2),
  bin: z.string().optional(),
  contactName: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  category: z.string().optional(),
  paymentTerms: z.string().optional(),
  minOrder: z.number().optional(),
  deliveryDays: z.number().int().optional(),
  notes: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const authResult = await requireApiAuth();
  if (!authResult.ok) return authResult.response;
  const { companyId } = authResult;

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? "";

  const suppliers = await prisma.supplier.findMany({
    where: {
      companyId,
      isActive: searchParams.get("active") === "false" ? undefined : true,
      ...(search ? {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { category: { contains: search, mode: "insensitive" as const } },
          { bin: { contains: search } },
        ],
      } : {}),
    },
    include: {
      _count: { select: { prices: true } },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(suppliers);
}

export async function POST(req: NextRequest) {
  const authResult = await requireApiAuth();
  if (!authResult.ok) return authResult.response;
  const { companyId } = authResult;

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation error", details: parsed.error.issues }, { status: 400 });

  const { minOrder, ...rest } = parsed.data;
  const supplier = await prisma.supplier.create({
    data: {
      ...rest,
      minOrder: minOrder ?? undefined,
      companyId,
      email: rest.email || undefined,
    },
  });

  return NextResponse.json(supplier, { status: 201 });
}
