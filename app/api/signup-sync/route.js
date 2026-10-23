// app/api/signup-sync/route.js — 가입 완료 직후 코치 콘솔 마스터(clients)에 이 가입자 행 upsert. 가입 페이지가 setActive 직후 호출.
// (예전 signup-notify에서 Slack 알림만 빼고 마스터 연동은 유지)
import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { upsertAthleteFromSignup } from "../../../lib/master";

async function getClerk() {
  return typeof clerkClient === "function" ? await clerkClient() : clerkClient;
}

export async function POST() {
  try {
    const { userId } = auth();
    if (!userId) return NextResponse.json({ ok: false }, { status: 401 });
    const u = await (await getClerk()).users.getUser(userId);
    const name = u?.unsafeMetadata?.name || u?.firstName || "";
    const email = u?.emailAddresses?.[0]?.emailAddress || "";
    // 이메일 키 upsert(중복 방지). 실패해도 가입 흐름은 진행되도록 내부에서 에러를 삼킨다.
    const sync = await upsertAthleteFromSignup({ name, email, clerkUserId: userId });
    return NextResponse.json({ ok: true, master: sync });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e?.message });
  }
}
