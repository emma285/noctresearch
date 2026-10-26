// app/api/coach/whoop-sync/route.js
// 코치 전용. 선수 상세 WHOOP 패널의 [지금 동기화] → 그 선수만 최근 3일 WHOOP 재확인.
import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { isCoachEmail } from "../../../../lib/coach";
import { getAthleteByRef } from "../../../../lib/master";
import { getConnection, syncConnection } from "../../../../lib/whoop/store";
import { logAccess } from "../../../../lib/accessLog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  const user = await currentUser();
  if (!isCoachEmail(user?.emailAddresses?.[0]?.emailAddress)) {
    return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });
  }
  const { ref } = await request.json().catch(() => ({}));
  const athlete = ref ? await getAthleteByRef(ref) : null;
  if (!athlete?.email) return NextResponse.json({ ok: false, reason: "not_found" }, { status: 404 });

  try {
    const result = await syncConnection(await getConnection(athlete.email), "manual");
    await logAccess({ actor: user.emailAddresses[0].emailAddress, action: "update", resource: "WHOOP 데이터 (수동 동기화)", target: { email: athlete.email, clientId: athlete.pageId }, path: "/api/coach/whoop-sync" });
    return NextResponse.json(result);
  } catch (e) {
    console.error("whoop manual sync failed:", e?.message);
    return NextResponse.json({ ok: false, reason: "error" }, { status: 500 });
  }
}
