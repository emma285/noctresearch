// app/api/access-log/login/route.js
// 로그인 접속 기록. 앱이 열릴 때 AccessLogPing이 호출 → Clerk 세션당 1줄(같은 세션은 DB 유니크 인덱스로 무시).
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getCurrentUser } from "../../../../lib/whoop/session";
import { logAccess } from "../../../../lib/accessLog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const { sessionId } = auth();
  const user = await getCurrentUser().catch(() => null);
  if (!user || !sessionId) return NextResponse.json({ ok: false }, { status: 401 });
  await logAccess({ actor: user.email, action: "login", sessionId });
  return NextResponse.json({ ok: true });
}
