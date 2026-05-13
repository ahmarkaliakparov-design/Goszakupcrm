import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export async function requireAuth() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return session;
}

export async function getCompanyId(): Promise<string> {
  const session = await requireAuth();
  const companyId = (session.user as { companyId?: string }).companyId;
  if (!companyId) redirect("/login");
  return companyId;
}
