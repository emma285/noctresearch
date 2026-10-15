// app/api/cron/whoop-refresh/route.js
// 매시간 Vercel Cron이 호출 → 곧 만료될 WHOOP 토큰을 미리 갱신(rotating refresh).
// 갱신이 거절된 선수는 status='needs_reauth' → 포탈에서 "재연결" 안내.
import { NextResponse } from "next/server";
import { refreshExpiringConnections } from "../../../../lib/whoop/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  // Vercel Cron 인증 — CRON_SECRET 설정 시 Bearer 헤더 확인 (routine-check와 동일)
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization") || "";
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
  }

  try {
    const result = await refreshExpiringConnections();
    console.log("whoop refresh:", result);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    console.error("whoop refresh failed:", e?.message);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
