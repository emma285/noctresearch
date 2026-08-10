// lib/log.js — 수면·루틴 로그 조회 (기록 탭 서버 컴포넌트용).
// api/log GET과 같은 소스(계정=이메일 키). 월별 days 맵 반환.
import { Client } from "@notionhq/client";

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const LOG_DB = process.env.NOTION_LOG_DATABASE_ID || "3b7565bc-0343-8190-a7ac-f326e916d318";

// KST 기준 오늘 YYYY-MM-DD (프로덕션 UTC 서버 대비 +9h)
export function kstToday() {
  return new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
}

// 특정 날짜(YYYY-MM-DD)의 전체 기록 → { sleep: {summary,data}|null, blocks: [{nid,time,type,detail,dur,text}] }
export async function getDayEntries(email, date) {
  if (!email || !date || !process.env.NOTION_API_KEY) return { sleep: null, blocks: [] };
  try {
    const res = await notion.databases.query({
      database_id: LOG_DB,
      filter: { and: [{ property: "계정", rich_text: { equals: email } }, { property: "날짜", date: { equals: date } }] },
      sorts: [{ timestamp: "created_time", direction: "ascending" }], // 마지막(=최신)이 sleep에 남음
      page_size: 100,
    });
    let sleep = null;
    const blocks = [];
    for (const p of res.results) {
      const pr = p.properties || {};
      const kind = pr["종류"]?.select?.name;
      const summary = (pr["요약"]?.rich_text || []).map((x) => x.plain_text).join("");
      let data = {};
      try { const raw = (pr["데이터"]?.rich_text || []).map((x) => x.plain_text).join(""); data = raw ? JSON.parse(raw) : {}; } catch {}
      if (kind === "수면") sleep = { summary, data };
      else blocks.push({ nid: p.id, time: data.time, type: data.type, detail: data.detail, dur: data.dur, text: data.text });
    }
    return { sleep, blocks };
  } catch (e) {
    console.error("getDayEntries failed:", e?.message);
    return { sleep: null, blocks: [] };
  }
}

// email의 특정 월(YYYY-MM) 로그 → { "YYYY-MM-DD": { sleep, routine, sleepSummary } }
export async function getLogDays(email, month) {
  if (!email || !process.env.NOTION_API_KEY) return {};
  try {
    const filter = { and: [{ property: "계정", rich_text: { equals: email } }] };
    if (month && /^\d{4}-\d{2}$/.test(month)) {
      const [y, m] = month.split("-").map(Number);
      const nm = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
      filter.and.push({ property: "날짜", date: { on_or_after: `${month}-01` } });
      filter.and.push({ property: "날짜", date: { before: `${nm}-01` } });
    }
    const days = {};
    let cursor;
    do {
      const res = await notion.databases.query({ database_id: LOG_DB, filter, page_size: 100, start_cursor: cursor });
      for (const p of res.results) {
        const pr = p.properties || {};
        const date = pr["날짜"]?.date?.start;
        if (!date) continue;
        const kind = pr["종류"]?.select?.name;
        if (!days[date]) days[date] = { sleep: false, routine: 0, sleepSummary: "" };
        if (kind === "수면") {
          days[date].sleep = true;
          const s = (pr["요약"]?.rich_text || []).map((x) => x.plain_text).join("");
          if (s) days[date].sleepSummary = s;
        } else {
          days[date].routine += 1;
        }
      }
      cursor = res.has_more ? res.next_cursor : undefined;
    } while (cursor);
    return days;
  } catch (e) {
    console.error("getLogDays failed:", e?.message);
    return {};
  }
}
