// app/share/[token]/route.js — 로그인 없는 공유 링크. lib/publicShares.js 에 등록된 토큰만 자료 원본을 그대로 서빙(탭바·돌아가기 버튼 없음).
import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { PUBLIC_SHARES } from "../../../lib/publicShares";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  const slug = PUBLIC_SHARES[String(params?.token || "")];
  if (!slug || !/^[a-z0-9-]+$/i.test(slug)) return new NextResponse("찾을 수 없는 링크예요.", { status: 404 });

  let html;
  try { html = await readFile(path.join(process.cwd(), "coach-assets", `${slug}.html`), "utf8"); }
  catch { return new NextResponse("자료를 찾을 수 없어요.", { status: 404 }); }

  return new NextResponse(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" },
  });
}
