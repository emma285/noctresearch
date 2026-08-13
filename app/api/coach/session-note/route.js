// app/api/coach/session-note/route.js — 코치가 세션 코칭 노트 저장 (Neon). 코치 전용.
// 공개 노트(요약·실천·코멘트·공개) + 상세 노트·녹음·전사 부분 저장. 공개 전환 시 다음 회차 자동 생성.
import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { isCoachEmail } from "../../../../lib/coach";
import { updateSessionNote } from "../../../../lib/master";

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
    const { id, summary, actions, comment, published, detail, audioUrl, transcript } = body;
    if (!id) return NextResponse.json({ success: false, message: "세션 id가 필요해요." }, { status: 400 });

    const r = await updateSessionNote(id, { summary, actions, comment, published, detail, audioUrl, transcript });
    if (!r.ok) return NextResponse.json({ success: false, message: r.reason === "empty" ? "저장할 내용이 없어요." : (r.reason || "저장 실패") }, { status: 400 });

    revalidateTag("athlete-data");
    return NextResponse.json({ success: true, createdNext: !!r.createdNext });
  } catch (e) {
    console.error("session-note save failed:", e?.message);
    return NextResponse.json({ success: false, message: e?.message || "저장 실패" }, { status: 500 });
  }
}
