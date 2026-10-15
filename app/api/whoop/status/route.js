// app/api/whoop/status/route.js — 포탈 "WHOOP 연결" 카드용 연결 상태.
import { NextResponse } from "next/server";
import { getCurrentUser } from "../../../../lib/whoop/session";
import { getConnection } from "../../../../lib/whoop/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ authenticated: false }, { status: 401 });

    const conn = await getConnection(user.email);
    return NextResponse.json({
      authenticated: true,
      connected: conn?.status === "active",
      status: conn?.status || "none",        // none|active|revoked|needs_reauth
      connectedAt: conn?.connectedAt || null,
      updatedAt: conn?.updatedAt || null,
    });
  } catch (e) {
    console.error("whoop status failed:", e?.message);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
