// app/api/whoop/diary-prefill/route.js — 수면일지 미리 채우기. 로그인 본인의 그 기상일 WHOOP 누운·깬 시각.
// GET ?date=YYYY-MM-DD → { bed, wake } (자정 기준 분) | { bed: null, wake: null }
import { NextResponse } from "next/server";
import { getCurrentUser } from "../../../../lib/whoop/session";
import { getWhoopSleepTimes } from "../../../../lib/whoop/read";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) return NextResponse.json({ bed: null, wake: null }, { status: 401 });
  const date = new URL(request.url).searchParams.get("date") || "";
  try {
    const t = await getWhoopSleepTimes(user.email, date);
    return NextResponse.json({ bed: t?.bedMin ?? null, wake: t?.wakeMin ?? null });
  } catch (e) {
    console.error("diary prefill failed:", e?.message);
    return NextResponse.json({ bed: null, wake: null });
  }
}
