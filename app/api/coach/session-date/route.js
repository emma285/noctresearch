// app/api/coach/session-date/route.js — 코치가 개별 회차 세션 날짜(session_at) 저장/해제. 코치 전용.
// 회차별 날짜를 직접 세션 행에 씀 → 세션 목록에 바로 반영. 다음 세션이면 마스터 nextSession도 동기화.
import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { isCoachEmail } from "../../../../lib/coach";
import { updateSessionDate } from "../../../../lib/master";

export const runtime = "nodejs";
async function getClerk() { return typeof clerkClient === "function" ? await clerkClient() : clerkClient; }

export async function POST(request) {
  try {
    const { userId } = auth();
    if (!userId) return NextResponse.json({ success: false, message: "로그인이 필요해요." }, { status: 401 });
    const cc = await getClerk();
    const me = await cc.users.getUser(userId);
    if (!isCoachEmail(me?.emailAddresses?.[0]?.emailAddress)) {
      return NextResponse.json({ success: false, message: "코치 권한이 없어요." }, { status: 403 });
    }

    const { sessionId, sessionAt } = await request.json();
    if (!sessionId) return NextResponse.json({ success: false, message: "세션 id가 필요해요." }, { status: 400 });

    const r = await updateSessionDate(sessionId, sessionAt || "");
    if (!r.ok) {
      const msg = r.reason === "bad-date" ? "날짜 형식이 올바르지 않아요." : r.reason === "no-session" ? "세션을 찾을 수 없어요." : (r.reason || "저장 실패");
      return NextResponse.json({ success: false, message: msg }, { status: 400 });
    }

    revalidateTag("athlete-data");
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("session-date save failed:", e?.message);
    return NextResponse.json({ success: false, message: e?.message || "저장 실패" }, { status: 500 });
  }
}
