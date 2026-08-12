// app/api/coach/session-note/route.js — 코치가 세션 코칭 노트 저장. 코치 전용.
// 코칭 세션 페이지의 세션 요약·실천 항목·코치 코멘트·노트 공개 속성 업데이트.
import { Client } from "@notionhq/client";
import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { isCoachEmail } from "../../../../lib/coach";

export const runtime = "nodejs";
const notion = new Client({ auth: process.env.NOTION_API_KEY });
const rt = (s) => (s ? [{ type: "text", text: { content: String(s).slice(0, 1900) } }] : []);
// 긴 텍스트(상세 노트·전사)는 1900자 단위로 쪼개 여러 rich_text 조각으로.
function rtLong(s) {
  const str = String(s || "");
  if (!str) return [];
  const out = [];
  for (let i = 0; i < str.length; i += 1900) out.push({ type: "text", text: { content: str.slice(i, i + 1900) } });
  return out;
}

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

    const body = await request.json();
    const { id, summary, actions, comment, published, detail, audioUrl, transcript } = body;
    if (!id) return NextResponse.json({ success: false, message: "세션 id가 필요해요." }, { status: 400 });

    // 전달된 필드만 부분 업데이트 (공개 노트 / 상세 노트 / 녹음·전사 각각 따로 저장 가능)
    const props = {};
    if (summary !== undefined) props["세션 요약"] = { rich_text: rt(summary) };
    if (actions !== undefined) {
      const actionsText = Array.isArray(actions) ? actions.map((a) => String(a).trim()).filter(Boolean).join("\n") : String(actions || "");
      props["실천 항목"] = { rich_text: rt(actionsText) };
    }
    if (comment !== undefined) props["코치 코멘트"] = { rich_text: rt(comment) };
    if (published !== undefined) props["노트 공개"] = { checkbox: !!published };
    // 상세 노트(내부 전용) — 섹션 객체를 JSON으로 저장
    if (detail !== undefined) props["상세 노트"] = { rich_text: rtLong(typeof detail === "string" ? detail : JSON.stringify(detail)) };
    if (audioUrl !== undefined) props["녹음 URL"] = { url: audioUrl || null };
    if (transcript !== undefined) props["전사"] = { rich_text: rtLong(transcript) };

    if (Object.keys(props).length === 0) return NextResponse.json({ success: false, message: "저장할 내용이 없어요." }, { status: 400 });
    await notion.pages.update({ page_id: id, properties: props });
    // 진행중 승격은 "첫 세션 날짜 도래" 기준으로 로컬 프로세서가 처리(여기선 안 함).
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("session-note save failed:", e?.message);
    return NextResponse.json({ success: false, message: e?.body?.message || e?.message || "저장 실패" }, { status: 500 });
  }
}
