// app/api/me/route.js
// 현재 로그인 유저(Clerk 이메일)의 마스터 레코드를 반환한다. A단계 = 읽기 전용.
// 포털/코치/로그 화면이 하드코딩·publicMetadata 대신 이 엔드포인트로 상태·다음세션을 읽어간다.
import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { getAthleteByEmail } from "../../../lib/master";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function getClerk() {
  return typeof clerkClient === "function" ? await clerkClient() : clerkClient;
}

export async function GET() {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ authenticated: false, athlete: null }, { status: 401 });
    }

    // Clerk 유저에서 이메일·이름 추출
    let email = "";
    let name = "";
    try {
      const cc = await getClerk();
      const u = await cc.users.getUser(userId);
      email = u?.emailAddresses?.[0]?.emailAddress || "";
      name = u?.unsafeMetadata?.name || u?.firstName || u?.username || "";
    } catch (e) {
      console.error("me: clerk lookup failed:", e?.message);
    }

    // 마스터 조회 (없으면 athlete: null — 아직 백필 안 된 유저)
    const athlete = email ? await getAthleteByEmail(email) : null;

    return NextResponse.json({
      authenticated: true,
      userId,
      email,
      name: athlete?.name || name,
      inMaster: !!athlete, // 마스터에 행이 있는지 → 백필 여부 판단용
      athlete,             // 없으면 null
    });
  } catch (e) {
    console.error("me route failed:", e?.message);
    return NextResponse.json({ error: e?.message || "failed" }, { status: 500 });
  }
}
