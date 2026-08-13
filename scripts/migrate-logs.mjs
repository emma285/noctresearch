// 기존 Notion 로그(수면·루틴) → Neon logs 테이블 복사. 재실행 안전(notion_id 스킵).
// 실행: node scripts/migrate-logs.mjs   (NOTION_API_KEY, DATABASE_URL 필요)
import { Client } from "@notionhq/client";
import { neon } from "@neondatabase/serverless";

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const sql = neon(process.env.DATABASE_URL);
const LOG_DB = process.env.NOTION_LOG_DATABASE_ID || "3b7565bc-0343-8190-a7ac-f326e916d318";
const plain = (rt) => (rt || []).map((x) => x.plain_text).join("");

const all = [];
let cursor;
do {
  const res = await notion.databases.query({ database_id: LOG_DB, page_size: 100, start_cursor: cursor });
  all.push(...res.results);
  cursor = res.has_more ? res.next_cursor : undefined;
} while (cursor);

const existing = new Set((await sql`SELECT notion_id FROM logs WHERE notion_id IS NOT NULL`).map((r) => r.notion_id));

let ins = 0, skip = 0, bad = 0;
for (const p of all) {
  if (existing.has(p.id)) { skip++; continue; }
  const pr = p.properties || {};
  const user = plain(pr["계정"]?.rich_text);
  const date = pr["날짜"]?.date?.start;
  const kind = pr["종류"]?.select?.name === "수면" ? "sleep" : "routine";
  const summary = plain(pr["요약"]?.rich_text);
  let data = {};
  try { const raw = plain(pr["데이터"]?.rich_text); data = raw ? JSON.parse(raw) : {}; } catch {}
  if (!date || !user) { bad++; continue; }
  await sql`INSERT INTO logs (user_email, date, kind, summary, data, notion_id)
            VALUES (${user}, ${date}, ${kind}, ${summary}, ${JSON.stringify(data)}::jsonb, ${p.id})`;
  ins++;
}
console.log(`Notion 로그 ${all.length}건 → 삽입 ${ins}, 스킵(이미있음) ${skip}, 무효 ${bad}`);
