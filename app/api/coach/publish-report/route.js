// app/api/coach/publish-report/route.js
// 코치가 특정 선수의 특정 리포트(slug)를 선수에게 공개/비공개.
// 리포트별 공개 상태는 선수 Clerk publicMetadata.publishedReports(공개된 slug 배열)에 저장.
import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { isCoachEmail } from "../../../../lib/coach";

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

    const { uid, slug, on } = await request.json();
    if (!uid || !slug) return NextResponse.json({ success: false, message: "uid·slug가 필요해요." }, { status: 400 });
    if (!/^[a-z0-9-]+$/i.test(String(slug))) return NextResponse.json({ success: false, message: "잘못된 slug." }, { status: 400 });

    // 대상 선수의 현재 공개 목록을 읽어 slug 추가/제거 후 전체 배열로 저장 (배열은 병합이 아니라 교체됨)
    const target = await cc.users.getUser(uid);
    const cur = Array.isArray(target?.publicMetadata?.publishedReports)
      ? target.publicMetadata.publishedReports.map(String).filter(Boolean)
      : [];
    const set = new Set(cur);
    if (on === true) set.add(String(slug));
    else set.delete(String(slug));
    const publishedReports = Array.from(set);

    await cc.users.updateUserMetadata(uid, { publicMetadata: { publishedReports } });
    return NextResponse.json({ success: true, published: publishedReports });
  } catch (e) {
    console.error("publish-report failed:", e?.message);
    return NextResponse.json({ success: false, message: e?.message || "저장 실패" }, { status: 500 });
  }
}
