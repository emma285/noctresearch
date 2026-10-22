// app/api/cron/whoop-sync/route.js
// 매일 12:00 KST Vercel Cron이 호출 → 연결된 선수 전원 최근 3일 WHOOP 재확인(웹훅 누락 보완) + 마지막 확인 시각 기록.
import { NextResponse } from "next/server";
import { syncAllConnections } from "../../../../lib/whoop/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request) {
  // Vercel Cron 인증 — CRON_SECRET 설정 시 Bearer 헤더 확인 (whoop-refresh와 동일)
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization") || "";
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
  }

  try {
    const result = await syncAllConnections();
    console.log("whoop sync:", result);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    console.error("whoop sync failed:", e?.message);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
