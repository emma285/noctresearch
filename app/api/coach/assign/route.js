// app/api/coach/assign/route.js
// 코치(Emma)만 호출 가능. 선수(uid)의 첫 세션 날짜·프로그램·세션 라벨을 Clerk publicMetadata에 기록.
// 포털은 이 값을 읽어 표시(없으면 '미정').
import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";

const COACH_EMAILS = (process.env.COACH_EMAILS || "hi.mido.kim@gmail.com")
  .split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);

async function getClerk() {
  return typeof clerkClient === "function" ? await clerkClient() : clerkClient;
}

export async function POST(request) {
  try {
    const { userId } = auth();
    if (!userId) return NextResponse.json({ success: false, message: "로그인이 필요해요." }, { status: 401 });

    const cc = await getClerk();
    const me = await cc.users.getUser(userId);
    const myEmail = me?.emailAddresses?.[0]?.emailAddress?.toLowerCase();
    if (!myEmail || !COACH_EMAILS.includes(myEmail)) {
      return NextResponse.json({ success: false, message: "코치 권한이 없어요." }, { status: 403 });
    }

    const { uid, firstSessionAt, programWeeks, sessionLabel, reportUrl, guideUrl, dataUrl, reportPublished } = await request.json();
    if (!uid) return NextResponse.json({ success: false, message: "대상 선수(uid)가 없어요." }, { status: 400 });

    // 부분 업데이트 — 전달된 필드만 반영(빈 문자열은 해제=null)
    const publicMetadata = {};
    if (firstSessionAt !== undefined) publicMetadata.firstSessionAt = firstSessionAt || null;
    if (sessionLabel !== undefined) publicMetadata.sessionLabel = sessionLabel || null;
    if (programWeeks !== undefined) publicMetadata.programWeeks = programWeeks ? Number(programWeeks) : null;
    if (reportUrl !== undefined) publicMetadata.reportUrl = reportUrl || null;
    if (guideUrl !== undefined) publicMetadata.guideUrl = guideUrl || null;
    if (dataUrl !== undefined) publicMetadata.dataUrl = dataUrl || null;
    // 리포트 공개 토글 — true면 선수 포털에 리포트 카드가 열림. 끄면 null로 해제
    if (reportPublished !== undefined) publicMetadata.reportPublished = reportPublished === true ? true : null;

    await cc.users.updateUserMetadata(uid, { publicMetadata });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("coach assign failed:", e?.message);
    return NextResponse.json({ success: false, message: e?.message || "저장 실패" }, { status: 500 });
  }
}
