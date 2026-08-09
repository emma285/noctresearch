// app/api/log/route.js
// 선수 전용 기록 페이지(로그인 없음)의 수면·루틴 기록 저장(POST) + 월별 조회(GET).
// 인증 없음 — body/쿼리의 user(이메일 식별자)로 어느 선수 기록인지 구분.
import { Client } from "@notionhq/client";
import { NextResponse } from "next/server";

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const LOG_DB = process.env.NOTION_LOG_DATABASE_ID || "3b7565bc-0343-8190-a7ac-f326e916d318";

function rt(s) {
  return [{ type: "text", text: { content: String(s ?? "").slice(0, 1900) } }];
}

// ── 저장 ──
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

// ── 조회 (월별) ──
// GET /api/log?user=<email>&month=YYYY-MM  → { days: { "YYYY-MM-DD": {sleep, routine, sleepSummary, items[]} } }
// user 없으면 헬스체크.
export async function GET(request) {
  try {
    const url = new URL(request.url);
    const user = url.searchParams.get("user");
    const month = url.searchParams.get("month"); // "2026-08"
    if (!user) return NextResponse.json({ ok: true, route: "log", db: LOG_DB });

    const filter = { and: [{ property: "계정", rich_text: { equals: user } }] };
    if (month && /^\d{4}-\d{2}$/.test(month)) {
      const [y, m] = month.split("-").map(Number);
      const nm = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
      filter.and.push({ property: "날짜", date: { on_or_after: `${month}-01` } });
      filter.and.push({ property: "날짜", date: { before: `${nm}-01` } });
    }

    const days = {};
    let cursor = undefined;
    do {
      const res = await notion.databases.query({
        database_id: LOG_DB,
        filter,
        page_size: 100,
        start_cursor: cursor,
      });
      for (const p of res.results) {
        const pr = p.properties || {};
        const date = pr["날짜"]?.date?.start;
        if (!date) continue;
        const kind = pr["종류"]?.select?.name;
        const summary = (pr["요약"]?.rich_text || []).map((x) => x.plain_text).join("");
        if (!days[date]) days[date] = { sleep: false, routine: 0, sleepSummary: "", items: [] };
        if (kind === "수면") {
          days[date].sleep = true;
          if (summary) days[date].sleepSummary = summary;
        } else {
          days[date].routine += 1;
          if (summary) days[date].items.push(summary);
        }
      }
      cursor = res.has_more ? res.next_cursor : undefined;
    } while (cursor);

    return NextResponse.json({ days });
  } catch (e) {
    return NextResponse.json({ days: {}, error: e?.body?.message || e?.message }, { status: 200 });
  }
}
