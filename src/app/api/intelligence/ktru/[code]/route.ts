import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/api-utils";
import { getKtruIntelligence } from "@/lib/intelligence";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const authResult = await requireApiAuth();
  if (!authResult.ok) return authResult.response;
  const { companyId } = authResult;

  const data = await getKtruIntelligence(companyId, decodeURIComponent(code));
  return NextResponse.json(data);
}
