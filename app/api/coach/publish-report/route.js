// app/api/coach/publish-report/route.js
// 코치가 특정 선수의 특정 리포트(slug)를 공개/비공개. 소스 = Neon clients.profile.publishedReports.
// Clerk publicMetadata는 best-effort 동기화(하위호환).
import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { isCoachEmail } from "../../../../lib/coach";
import { getAthleteByEmail, setPublishedReports } from "../../../../lib/master";

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

    const { uid, email, slug, on } = await request.json();
    if (!slug || (!email && !uid)) return NextResponse.json({ success: false, message: "email(또는 uid)·slug가 필요해요." }, { status: 400 });
    if (!/^[a-z0-9-]+$/i.test(String(slug))) return NextResponse.json({ success: false, message: "잘못된 slug." }, { status: 400 });

    // 대상 이메일 확정 (email 우선, 없으면 uid→Clerk 조회)
    let athleteEmail = email || "";
    if (!athleteEmail && uid) { try { const t = await cc.users.getUser(uid); athleteEmail = t?.emailAddresses?.[0]?.emailAddress || ""; } catch {} }

    // Neon(단일 소스) — 현재 공개목록 읽어 slug 추가/제거 후 저장
    const row = athleteEmail ? await getAthleteByEmail(athleteEmail) : null;
    if (!row?.pageId) return NextResponse.json({ success: false, message: "선수를 찾을 수 없어요." }, { status: 404 });
    const set = new Set((row.publishedReports || []).map(String).filter(Boolean));
    if (on === true) set.add(String(slug)); else set.delete(String(slug));
    const publishedReports = Array.from(set);
    await setPublishedReports(row.pageId, publishedReports);
    revalidateTag("athlete-data");

    // Clerk 하위호환 동기화 (best-effort)
    try {
      const clerkUid = uid || row.clerkUserId;
      if (clerkUid) await cc.users.updateUserMetadata(clerkUid, { publicMetadata: { publishedReports } });
    } catch (e) { console.error("publish-report clerk sync failed:", e?.message); }

    return NextResponse.json({ success: true, published: publishedReports });
  } catch (e) {
    console.error("publish-report failed:", e?.message);
    return NextResponse.json({ success: false, message: e?.message || "저장 실패" }, { status: 500 });
  }
}
