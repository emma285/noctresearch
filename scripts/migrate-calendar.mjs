// Notion 캘린더 이벤트 → Neon calendar_events. 재실행 안전(id=Notion pageId upsert).
// 실행: node scripts/migrate-calendar.mjs  (NOTION_API_KEY, DATABASE_URL 필요)
import { Client } from "@notionhq/client";
import { neon } from "@neondatabase/serverless";

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const sql = neon(process.env.DATABASE_URL);
const CAL_DB = process.env.NOTION_CALENDAR_DATABASE_ID || "3ba565bc034381f5b736c713e7e708c5";
const txt = (p) => (p?.rich_text || p?.title || []).map((t) => t.plain_text).join("") || "";
const day10 = (s) => (s ? String(s).slice(0, 10) : null);

const all = [];
let cursor;
do {
  const res = await notion.databases.query({ database_id: CAL_DB, page_size: 100, start_cursor: cursor });
  all.push(...res.results);
  cursor = res.has_more ? res.next_cursor : undefined;
} while (cursor);

const validClients = new Set((await sql`SELECT id FROM clients`).map((r) => r.id));

let ins = 0, orphan = 0;
for (const p of all) {
  const P = p.properties || {};
  const clientId = P["선수"]?.relation?.[0]?.id || null;
  if (!clientId || !validClients.has(clientId)) { orphan++; continue; }
  const d = P["기간"]?.date || {};
  if (!d.start) { orphan++; continue; }
  const vals = {
    id: p.id,
    clientId,
    type: P["종류"]?.select?.name || null,
    title: txt(P["제목"]) || null,
    start: day10(d.start),
    end: day10(d.end),
    memo: txt(P["메모"]) || null,
    isPublic: P["공개"]?.checkbox === true,
    source: P["출처"]?.select?.name || "코치",
  };
  await sql`INSERT INTO calendar_events (id, client_id, type, title, start_date, end_date, memo, is_public, source)
    VALUES (${vals.id}, ${vals.clientId}, ${vals.type}, ${vals.title}, ${vals.start}, ${vals.end}, ${vals.memo}, ${vals.isPublic}, ${vals.source})
    ON CONFLICT (id) DO UPDATE SET
      client_id=EXCLUDED.client_id, type=EXCLUDED.type, title=EXCLUDED.title, start_date=EXCLUDED.start_date,
      end_date=EXCLUDED.end_date, memo=EXCLUDED.memo, is_public=EXCLUDED.is_public, source=EXCLUDED.source`;
  ins++;
}
console.log(`Notion 이벤트 ${all.length}건 → upsert ${ins}, 고아 ${orphan}`);
