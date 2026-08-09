// 리포트 인증 서버 — report-assets/<slug>.html 을 로그인 상태에서만 서빙.
// 예: /report/view/yuna-report
// 권한: 코치는 모든 리포트 열람 / 선수는 "본인 리포트"이면서 코치가 공개(reportPublished)한 경우만.
// (리포트를 public/ 밖으로 빼서 URL만으로는 접근 불가)
import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { isCoachEmail } from "../../../../lib/coach";
import { resolveAssets } from "../../../../lib/athleteAssets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function getClerk() {
  return typeof clerkClient === "function" ? await clerkClient() : clerkClient;
}

// "/report/view/yuna-report" · "/reports/yuna-report.html" → "yuna-report"
function slugFromUrl(u) {
  if (!u) return "";
  const last = String(u).split("?")[0].split("/").pop() || "";
  return last.replace(/\.html?$/i, "");
}

export async function GET(_request, { params }) {
  try {
    const { userId } = auth();
    if (!userId) return new NextResponse("로그인이 필요해요.", { status: 401 });

    // slug 화이트리스트(영문·숫자·하이픈만) → 경로 순회 차단
    const slug = String(params?.slug || "");
    if (!/^[a-z0-9-]+$/i.test(slug)) return new NextResponse("잘못된 파일명이에요.", { status: 400 });

    const cc = await getClerk();
    const me = await cc.users.getUser(userId);
    const email = me?.emailAddresses?.[0]?.emailAddress;

    let allowed = false;
    if (isCoachEmail(email)) {
      allowed = true; // 코치는 모든 리포트 열람 가능
    } else {
      // 선수 본인 리포트만 — 배정된 리포트 slug가 일치하고, 코치가 공개했을 때만
      const meta = me?.publicMetadata || {};
      const name = me?.unsafeMetadata?.name || me?.firstName || me?.username || "";
      const mine = resolveAssets({ name, email, reportUrl: meta.reportUrl, guideUrl: meta.guideUrl, dataUrl: meta.dataUrl });
      const published = meta.reportPublished === true;
      if (published && slugFromUrl(mine.report) === slug) allowed = true;
    }
    if (!allowed) return new NextResponse("이 리포트를 볼 권한이 없어요.", { status: 403 });

    const filePath = path.join(process.cwd(), "report-assets", `${slug}.html`);
    let html;
    try {
      html = await readFile(filePath, "utf8");
    } catch {
      return new NextResponse("리포트를 찾을 수 없어요.", { status: 404 });
    }

    return new NextResponse(html, {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "private, max-age=60" },
    });
  } catch (e) {
    return new NextResponse("오류: " + (e?.message || "unknown"), { status: 500 });
  }
}
