// app/api/signup-notify/route.js — 가입 완료 시 #코칭 알림. 가입 페이지가 setActive 직후 호출.
import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { notifyCoaching } from "../../../lib/notify";
import { upsertAthleteFromSignup } from "../../../lib/master";

async function getClerk() {
  return typeof clerkClient === "function" ? await clerkClient() : clerkClient;
}

export async function POST(request) {
  try {
    let name = "", email = "", clerkUserId = "";
    // 우선 로그인 세션에서 실제 정보 (가입 직후 세션 존재)
    try {
      const { userId } = auth();
      if (userId) {
        clerkUserId = userId;
        const cc = await getClerk();
        const u = await cc.users.getUser(userId);
        name = u?.unsafeMetadata?.name || u?.firstName || "";
        email = u?.emailAddresses?.[0]?.emailAddress || "";
      }
    } catch {}
    if (!name && !email) {
      try { const b = await request.json(); name = b?.name || ""; email = b?.email || ""; } catch {}
    }
    // 코치 콘솔 자동 연동: 마스터DB에 이 가입자 행을 upsert(이메일 키, 중복 방지).
    // 실패해도 가입/알림은 진행되도록 내부에서 에러를 삼킨다.
    const sync = await upsertAthleteFromSignup({ name, email, clerkUserId });
    await notifyCoaching(`*새 회원 가입* — ${name || "이름 미상"}${email ? ` (${email})` : ""}`);
    return NextResponse.json({ ok: true, master: sync });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e?.message });
  }
}
