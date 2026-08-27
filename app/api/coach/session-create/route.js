// app/api/coach/session-create/route.js — 코치가 회차를 직접 지정해 세션 생성 (Neon). 코치 전용.
// 0.5 단위 회차 허용(예: 1.5 중간 점검 세션). idempotent by (clientId, n).
import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { isCoachEmail } from "../../../../lib/coach";
import { createSession } from "../../../../lib/master";

export const runtime = "nodejs";
async function getClerk() { return typeof clerkClient === "function" ? await clerkClient() : clerkClient; }

export async function POST(request) {
  try {
    const { userId } = auth();
    if (!userId) return NextResponse.json({ success: false, message: "로그인이 필요해요." }, { status: 401 });
    const cc = await getClerk();
    const me = await cc.users.getUser(userId);
    if (!isCoachEmail(me?.emailAddresses?.[0]?.emailAddress)) {
      return NextResponse.json({ success: false, message: "코치 권한이 없어요." }, { status: 403 });
    }

    const body = await request.json();
    const clientId = body?.clientId;
    const n = Number(body?.n);
    const sessionAt = body?.sessionAt || null;
    if (!clientId) return NextResponse.json({ success: false, message: "선수 id가 필요해요." }, { status: 400 });
    // 0.5 단위 양수만 허용 (1, 1.5, 2, 2.5 …)
    if (!Number.isFinite(n) || n <= 0 || (n * 2) % 1 !== 0) {
      return NextResponse.json({ success: false, message: "회차는 0.5 단위 양수여야 해요 (예: 1, 1.5, 2)." }, { status: 400 });
    }

    const id = await createSession(clientId, { n, sessionAt });
    if (!id) return NextResponse.json({ success: false, message: "세션 생성 실패" }, { status: 400 });

    revalidateTag("athlete-data");
    return NextResponse.json({ success: true, id });
  } catch (e) {
    console.error("session-create failed:", e?.message);
    return NextResponse.json({ success: false, message: e?.message || "생성 실패" }, { status: 500 });
  }
}
