// app/api/coach/master/route.js — 코치가 선수 마스터 행에 쓰기(다음 세션·상태·주차 등). 코치 전용.
// 코치 액션의 단일 소스를 마스터로 통일 (기존 Clerk 메타 방식 대체).
import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { isCoachEmail } from "../../../../lib/coach";
import { updateMasterFields } from "../../../../lib/master";

export const runtime = "nodejs";

async function getClerk() {
  return typeof clerkClient === "function" ? await clerkClient() : clerkClient;
}

export async function POST(request) {
  try {
    const { userId } = auth();
    if (!userId) return NextResponse.json({ success: false, message: "로그인이 필요해요." }, { status: 401 });
    const cc = await getClerk();
    const me = await cc.users.getUser(userId);
    if (!isCoachEmail(me?.emailAddresses?.[0]?.emailAddress)) {
      return NextResponse.json({ success: false, message: "코치 권한이 없어요." }, { status: 403 });
    }

    const { pageId, nextSession, status, week, program, sport, tier } = await request.json();
    if (!pageId) return NextResponse.json({ success: false, message: "선수(pageId)가 없어요." }, { status: 400 });

    const ok = await updateMasterFields(pageId, { nextSession, status, week, program, sport, tier });
    if (!ok) return NextResponse.json({ success: false, message: "저장할 내용이 없거나 실패했어요." }, { status: 400 });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("coach master write failed:", e?.message);
    return NextResponse.json({ success: false, message: e?.message || "저장 실패" }, { status: 500 });
  }
}
