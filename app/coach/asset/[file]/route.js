// 코치 전용 파일 서버 — coach-assets/<slug>.html 을 코치 로그인 상태에서만 서빙.
// 예: /coach/asset/yuna-guide  ·  /coach/asset/yuna-data
// URL에 .html 을 붙이지 않는다(미들웨어가 .html 경로를 인증에서 제외하므로).
import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { isCoachEmail } from "../../../../lib/coach";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function getClerk() {
  return typeof clerkClient === "function" ? await clerkClient() : clerkClient;
}

export async function GET(_request, { params }) {
  try {
    const { userId } = auth();
    if (!userId) return new NextResponse("로그인이 필요해요.", { status: 401 });
    const cc = await getClerk();
    const me = await cc.users.getUser(userId);
    const email = me?.emailAddresses?.[0]?.emailAddress;
    if (!isCoachEmail(email)) return new NextResponse("코치만 볼 수 있어요.", { status: 403 });

    // slug 화이트리스트(영문·숫자·하이픈만) → 경로 순회 차단
    const slug = String(params?.file || "");
    if (!/^[a-z0-9-]+$/i.test(slug)) return new NextResponse("잘못된 파일명이에요.", { status: 400 });

    const filePath = path.join(process.cwd(), "coach-assets", `${slug}.html`);
    let html;
    try {
      html = await readFile(filePath, "utf8");
    } catch {
      return new NextResponse("파일을 찾을 수 없어요.", { status: 404 });
    }

    // 코치 페이지로 돌아가는 플로팅 버튼 주입 (뒤로가기 없으면 대시보드)
    const backBar =
      '<a href="/portal" onclick="if(history.length>1){history.back();return false}" ' +
      'style="position:fixed;top:14px;left:14px;z-index:99999;background:#0D1B2A;color:#fff;' +
      "font-family:Pretendard,'Apple SD Gothic Neo',sans-serif;font-size:12.5px;font-weight:700;" +
      'padding:9px 14px;border-radius:9px;text-decoration:none;box-shadow:0 4px 14px rgba(13,27,42,.28)">← 돌아가기</a>';
    html = html.replace(/<body([^>]*)>/i, (m) => m + backBar);

    return new NextResponse(html, {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "private, max-age=60" },
    });
  } catch (e) {
    return new NextResponse("오류: " + (e?.message || "unknown"), { status: 500 });
  }
}
