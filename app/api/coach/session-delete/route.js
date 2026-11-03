// app/api/coach/session-delete/route.js — 코치가 아직 진행 안 한 세션 행 삭제 (Neon). 코치 전용.
// 공개/노트/녹음 있는 세션은 lib에서 거부 → 진행된 기록은 지워지지 않음.
import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { isCoachEmail } from "../../../../lib/coach";
import { deleteSession } from "../../../../lib/master";

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

    const { sessionId } = await request.json();
    if (!sessionId) return NextResponse.json({ success: false, message: "세션 id가 필요해요." }, { status: 400 });

    const r = await deleteSession(sessionId);
    if (!r.ok) {
      const msg = r.reason === "has-record" ? "노트·녹음이 있거나 공개된 세션은 삭제할 수 없어요." : r.reason === "no-session" ? "세션을 찾을 수 없어요." : (r.reason || "삭제 실패");
      return NextResponse.json({ success: false, message: msg }, { status: 400 });
    }

    revalidateTag("athlete-data");
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("session-delete failed:", e?.message);
    return NextResponse.json({ success: false, message: e?.message || "삭제 실패" }, { status: 500 });
  }
}
