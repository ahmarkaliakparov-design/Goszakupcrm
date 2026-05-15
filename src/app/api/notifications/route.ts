import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest) {
  const authResult = await requireApiAuth();
  if (!authResult.ok) return authResult.response;
  const { companyId } = authResult;

  const [items, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.notification.count({ where: { companyId, isRead: false } }),
  ]);

  return NextResponse.json({ items, unreadCount });
}

export async function POST(_req: NextRequest) {
  const authResult = await requireApiAuth();
  if (!authResult.ok) return authResult.response;
  const { companyId } = authResult;

  // Mark all as read
  await prisma.notification.updateMany({
    where: { companyId, isRead: false },
    data: { isRead: true },
  });

  return NextResponse.json({ success: true });
}
