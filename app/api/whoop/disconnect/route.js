// app/api/whoop/disconnect/route.js — 선수가 WHOOP 연결 해제. 토큰 폐기 + status='revoked'.
import { NextResponse } from "next/server";
import { getCurrentUser } from "../../../../lib/whoop/session";
import { disconnect } from "../../../../lib/whoop/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false }, { status: 401 });

    const done = await disconnect(user.email);
    return NextResponse.json({ success: true, disconnected: done });
  } catch (e) {
    console.error("whoop disconnect failed:", e?.message);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
