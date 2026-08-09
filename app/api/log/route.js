// app/api/log/route.js
// 선수 전용 기록 페이지(로그인 없음)에서 수면·루틴 기록을 Notion "선수 기록" DB로 저장.
// 인증 없음 — body의 user(이메일 식별자)로 어느 선수 기록인지 구분.
import { Client } from "@notionhq/client";
import { NextResponse } from "next/server";

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const LOG_DB = process.env.NOTION_LOG_DATABASE_ID || "3b7565bc-0343-8190-a7ac-f326e916d318";

function rt(s) {
  return [{ type: "text", text: { content: String(s ?? "").slice(0, 1900) } }];
}

export async function POST(request) {
  try {
    const body = await request.json();
    const user = body.user || "unknown";
    const kind = body.kind === "sleep" ? "수면" : "루틴";
    const date = body.date || new Date().toISOString().slice(0, 10);
    const summary = body.summary || "";
    const data = body.data || {};
    const title = `${user} · ${date} · ${kind}`;

    await notion.pages.create({
      parent: { database_id: LOG_DB },
      properties: {
        "제목": { title: rt(title) },
        "계정": { rich_text: rt(user) },
        "날짜": { date: { start: date } },
        "종류": { select: { name: kind } },
        "요약": { rich_text: rt(summary) },
        "데이터": { rich_text: rt(JSON.stringify(data)) },
      },
    });
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e?.body?.message || e?.message || "save failed" },
      { status: 500 }
    );
  }
}

// 헬스체크
export async function GET() {
  return NextResponse.json({ ok: true, route: "log", db: LOG_DB });
}
