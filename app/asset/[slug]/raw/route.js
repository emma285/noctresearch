// app/asset/[slug]/raw/route.js — 부가자료 원본 HTML 서버 (iframe embed용).
// 선수는 자기에게 노출된(공개 세션 첨부) 자료만. 코치는 전부. ?embed=1 이면 돌아가기 버튼 생략(셸이 탭바 제공).
import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { isCoachEmail } from "../../../../lib/coach";
import { getAthleteByEmail, getExposedAssetSlugs } from "../../../../lib/master";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function getClerk() {
  return typeof clerkClient === "function" ? await clerkClient() : clerkClient;
}

export async function GET(request, { params }) {
  try {
    const { userId } = auth();
    if (!userId) return new NextResponse("로그인이 필요해요.", { status: 401 });
    const cc = await getClerk();
    const me = await cc.users.getUser(userId);
    const email = me?.emailAddresses?.[0]?.emailAddress;

    const slug = String(params?.slug || "");
    if (!/^[a-z0-9-]+$/i.test(slug)) return new NextResponse("잘못된 파일명이에요.", { status: 400 });

    if (!isCoachEmail(email)) {
      const athlete = email ? await getAthleteByEmail(email) : null;
      const exposed = athlete ? await getExposedAssetSlugs(athlete.pageId) : [];
      if (!exposed.includes(slug)) return new NextResponse("아직 볼 수 없는 자료예요.", { status: 403 });
    }

    const filePath = path.join(process.cwd(), "coach-assets", `${slug}.html`);
    let html;
    try { html = await readFile(filePath, "utf8"); }
    catch { return new NextResponse("자료를 찾을 수 없어요.", { status: 404 }); }

    // 셸(탭바) 안 iframe이면 돌아가기 버튼 생략. 직접 열면 버튼 주입.
    const embed = new URL(request.url).searchParams.get("embed");
    if (!embed) {
      const backBar =
        '<a href="/portal" onclick="if(history.length>1){history.back();return false}" ' +
        'style="position:fixed;top:14px;left:14px;z-index:99999;background:#0D1B2A;color:#fff;' +
        "font-family:Pretendard,'Apple SD Gothic Neo',sans-serif;font-size:12.5px;font-weight:700;" +
        'padding:9px 14px;border-radius:9px;text-decoration:none;box-shadow:0 4px 14px rgba(13,27,42,.28)">← 돌아가기</a>';
      html = html.replace(/<body([^>]*)>/i, (m) => m + backBar);
    }

    return new NextResponse(html, {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "private, max-age=60" },
    });
  } catch (e) {
    return new NextResponse("오류: " + (e?.message || "unknown"), { status: 500 });
  }
}
