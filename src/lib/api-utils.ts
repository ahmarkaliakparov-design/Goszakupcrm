import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

interface SessionUser {
  id?: string;
  name?: string | null;
  email?: string | null;
  companyId?: string;
}

type AppSession = { user: SessionUser } | null;

// Workaround for next-auth v5 beta type issue in API routes
const getSession = async (): Promise<AppSession> => {
  return (auth as unknown as () => Promise<AppSession>)();
};

export async function requireApiAuth(): Promise<
  | { ok: true; session: AppSession & object; companyId: string; userId: string }
  | { ok: false; response: NextResponse }
> {
  const session = await getSession();
  const companyId = session?.user?.companyId;
  const userId = session?.user?.id;

  if (!session || !companyId || !userId) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  return { ok: true, session, companyId, userId };
}
