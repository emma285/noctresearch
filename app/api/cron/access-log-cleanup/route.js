// app/api/cron/access-log-cleanup/route.js
// 매일 Vercel Cron이 호출 → 보관 기간 지난 접속 기록 삭제 (선수 1년, 코치·운영자 2년).
import { NextResponse } from "next/server";
import { deleteExpiredAccessLogs } from "../../../../lib/accessLog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  // Vercel Cron 인증 — CRON_SECRET 설정 시 Bearer 헤더 확인 (whoop-sync와 동일)
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization") || "";
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
  }

  try {
    const deleted = await deleteExpiredAccessLogs();
    console.log("access log cleanup:", deleted);
    return NextResponse.json({ ok: true, deleted });
  } catch (e) {
    console.error("access log cleanup failed:", e?.message);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
