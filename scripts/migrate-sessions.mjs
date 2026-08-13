// Notion 코칭 세션 → Neon sessions. 재실행 안전(id=Notion pageId upsert).
// 선수 relation(→마스터 pageId) = clients.id 로 매핑(clients.id=구 Notion pageId).
// 실행: node scripts/migrate-sessions.mjs  (NOTION_API_KEY, DATABASE_URL 필요)
import { Client } from "@notionhq/client";
import { neon } from "@neondatabase/serverless";

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const sql = neon(process.env.DATABASE_URL);
const SESSIONS_DB = process.env.NOTION_SESSIONS_DATABASE_ID || "349e906e42e94e1592679d390fbe2916";
const rt = (p) => (p?.rich_text || p?.title || []).map((t) => t.plain_text).join("");

const all = [];
let cursor;
do {
  const res = await notion.databases.query({ database_id: SESSIONS_DB, page_size: 100, start_cursor: cursor });
  all.push(...res.results);
  cursor = res.has_more ? res.next_cursor : undefined;
} while (cursor);

// 유효 client id 집합(고아 세션 방지)
const validClients = new Set((await sql`SELECT id FROM clients`).map((r) => r.id));

let ins = 0, orphan = 0;
for (const p of all) {
  const P = p.properties || {};
  const clientId = P["선수"]?.relation?.[0]?.id || null;
  if (!clientId || !validClients.has(clientId)) { orphan++; continue; }
  const n = typeof P["회차"]?.number === "number" ? P["회차"].number : null;
  const title = rt(P["세션"]) || null;
  const topics = (P["다룬 토픽"]?.multi_select || []).map((t) => t.name);
  const sessionAt = P["일시"]?.date?.start || null;
  const summary = rt(P["세션 요약"]) || null;
  const actionItems = rt(P["실천 항목"]) || null;
  const coachComment = rt(P["코치 코멘트"]) || null;
  const published = P["노트 공개"]?.checkbox === true;
  let detail = {};
  try { const raw = rt(P["상세 노트"]); detail = raw ? JSON.parse(raw) : {}; } catch { detail = { memo: rt(P["상세 노트"]) }; }
  const audioUrl = P["녹음 URL"]?.url || null;
  const transcript = rt(P["전사"]) || null;

  await sql`INSERT INTO sessions (id, client_id, n, title, topics, session_at, summary, action_items, coach_comment, published, detail, audio_url, transcript, notion_id)
    VALUES (${p.id}, ${clientId}, ${n}, ${title}, ${JSON.stringify(topics)}::jsonb, ${sessionAt}, ${summary}, ${actionItems}, ${coachComment}, ${published}, ${JSON.stringify(detail)}::jsonb, ${audioUrl}, ${transcript}, ${p.id})
    ON CONFLICT (id) DO UPDATE SET
      client_id=EXCLUDED.client_id, n=EXCLUDED.n, title=EXCLUDED.title, topics=EXCLUDED.topics, session_at=EXCLUDED.session_at,
      summary=EXCLUDED.summary, action_items=EXCLUDED.action_items, coach_comment=EXCLUDED.coach_comment,
      published=EXCLUDED.published, detail=EXCLUDED.detail, audio_url=EXCLUDED.audio_url, transcript=EXCLUDED.transcript`;
  ins++;
}
console.log(`Notion 세션 ${all.length}건 → upsert ${ins}, 고아(선수 없음) ${orphan}`);
