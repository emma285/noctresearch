// app/api/coach/session-note/route.js — 코치가 세션 코칭 노트 저장. 코치 전용.
// 코칭 세션 페이지의 세션 요약·실천 항목·코치 코멘트·노트 공개 속성 업데이트.
import { Client } from "@notionhq/client";
import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { isCoachEmail } from "../../../../lib/coach";

export const runtime = "nodejs";
const notion = new Client({ auth: process.env.NOTION_API_KEY });
const rt = (s) => (s ? [{ type: "text", text: { content: String(s).slice(0, 1900) } }] : []);

async function getClerk() {
  return typeof clerkClient === "function" ? await clerkClient() : clerkClient;
}

export async function POST(request) {
  try {
    const { userId } = auth();
    if (!userId) return NextResponse.json({ success: false, message: "로그인이 필요해요." }, { status: 401 });
    const cc = await getClerk();
    const me = await cc.users.getUser(userId);
    if (!isCoachEmail(me?.emailAddresses?.[0]?.emailAddress)) {
      return NextResponse.json({ success: false, message: "코치 권한이 없어요." }, { status: 403 });
    }

    const { id, summary = "", actions = [], comment = "", published = false } = await request.json();
    if (!id) return NextResponse.json({ success: false, message: "세션 id가 필요해요." }, { status: 400 });
    const actionsText = Array.isArray(actions) ? actions.map((a) => String(a).trim()).filter(Boolean).join("\n") : String(actions || "");

    await notion.pages.update({
      page_id: id,
      properties: {
        "세션 요약": { rich_text: rt(summary) },
        "실천 항목": { rich_text: rt(actionsText) },
        "코치 코멘트": { rich_text: rt(comment) },
        "노트 공개": { checkbox: !!published },
      },
    });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("session-note save failed:", e?.message);
    return NextResponse.json({ success: false, message: e?.body?.message || e?.message || "저장 실패" }, { status: 500 });
  }
}
