import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { hash, compare } from "bcryptjs";

const profileSchema = z.object({
  action: z.literal("profile"),
  name: z.string().min(2),
  email: z.string().email(),
});

const companySchema = z.object({
  action: z.literal("company"),
  name: z.string().min(2),
  bin: z.string().optional(),
});

const passwordSchema = z.object({
  action: z.literal("password"),
  currentPassword: z.string().min(6),
  newPassword: z.string().min(8),
});

const goszakupSchema = z.object({
  action: z.literal("goszakup"),
  token: z.string().min(10),
});

const telegramSchema = z.object({
  action: z.literal("telegram"),
  botToken: z.string().optional(),
  chatId: z.string().optional(),
});

export async function PUT(req: NextRequest) {
  const authResult = await requireApiAuth();
  if (!authResult.ok) return authResult.response;
  const { companyId, userId } = authResult;

  const body = await req.json();

  if (body.action === "profile") {
    const parsed = profileSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Validation error" }, { status: 400 });

    const emailTaken = await prisma.user.findFirst({
      where: { email: parsed.data.email, NOT: { id: userId } },
    });
    if (emailTaken) return NextResponse.json({ error: "Email уже используется" }, { status: 409 });

    await prisma.user.update({
      where: { id: userId },
      data: { name: parsed.data.name, email: parsed.data.email },
    });
    return NextResponse.json({ success: true });
  }

  if (body.action === "company") {
    const parsed = companySchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Validation error" }, { status: 400 });

    await prisma.company.update({
      where: { id: companyId },
      data: { name: parsed.data.name, bin: parsed.data.bin || undefined },
    });
    return NextResponse.json({ success: true });
  }

  if (body.action === "password") {
    const parsed = passwordSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Validation error" }, { status: 400 });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const valid = await compare(parsed.data.currentPassword, user.passwordHash);
    if (!valid) return NextResponse.json({ error: "Неверный текущий пароль" }, { status: 400 });

    const newHash = await hash(parsed.data.newPassword, 12);
    await prisma.user.update({ where: { id: userId }, data: { passwordHash: newHash } });
    return NextResponse.json({ success: true });
  }

  if (body.action === "goszakup") {
    const parsed = goszakupSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Validation error" }, { status: 400 });

    await prisma.company.update({
      where: { id: companyId },
      data: { settings: { goszakupToken: parsed.data.token } },
    });
    return NextResponse.json({ success: true });
  }

  if (body.action === "telegram") {
    const parsed = telegramSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Validation error" }, { status: 400 });

    const company = await prisma.company.findUnique({ where: { id: companyId } });
    const currentSettings = (company?.settings ?? {}) as Record<string, unknown>;
    await prisma.company.update({
      where: { id: companyId },
      data: {
        settings: {
          ...currentSettings,
          telegramBotToken: parsed.data.botToken,
          telegramChatId: parsed.data.chatId,
        },
      },
    });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

export async function GET(req: NextRequest) {
  const authResult = await requireApiAuth();
  if (!authResult.ok) return authResult.response;
  const { companyId, userId } = authResult;

  const [user, company] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true, role: true } }),
    prisma.company.findUnique({ where: { id: companyId }, select: { name: true, bin: true, settings: true } }),
  ]);

  return NextResponse.json({ user, company });
}
