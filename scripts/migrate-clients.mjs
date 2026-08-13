// Notion 마스터(코칭 클라이언트) → Neon clients. 재실행 안전(id=Notion pageId, upsert).
// 실행: node scripts/migrate-clients.mjs  (NOTION_API_KEY, DATABASE_URL 필요)
import { Client } from "@notionhq/client";
import { neon } from "@neondatabase/serverless";

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const sql = neon(process.env.DATABASE_URL);
const MASTER_DB = process.env.NOTION_MASTER_DATABASE_ID || "2aed85ca21de485f812b6e4ccfc5ffce";

const txt = (p) => (p?.rich_text || p?.title || []).map((t) => t.plain_text).join("") || "";
const sel = (p) => p?.select?.name || null;
const num = (p) => (typeof p?.number === "number" ? p.number : null);

const all = [];
let cursor;
do {
  const res = await notion.databases.query({ database_id: MASTER_DB, page_size: 100, start_cursor: cursor });
  all.push(...res.results);
  cursor = res.has_more ? res.next_cursor : undefined;
} while (cursor);

let ins = 0, bad = 0;
for (const page of all) {
  const P = page.properties || {};
  const email = P["이메일"]?.email;
  if (!email) { bad++; continue; }
  const profile = {
    sport: sel(P["종목"]),
    startDate: P["시작일"]?.date?.start || null,
    dashboardToken: txt(P["대시보드 토큰"]) || null,
    phone: P["연락처"]?.phone_number || null,
    publishedReports: txt(P["공개 리포트"]).split(/[\s,]+/).map((s) => s.trim()).filter(Boolean),
  };
  const vals = {
    id: page.id,
    email,
    name: txt(P["이름"]) || null,
    status: sel(P["상태"]),
    program: sel(P["프로그램"]),
    next_session: P["다음 세션"]?.date?.start || null,
    week: num(P["코칭 주차"]),
    tier: sel(P["티어"]),
    clerk_user_id: txt(P["Clerk 유저ID"]) || null,
  };
  try {
    await sql`INSERT INTO clients (id, email, name, type, status, program, next_session, week, tier, clerk_user_id, profile, notion_id)
      VALUES (${vals.id}, ${vals.email}, ${vals.name}, 'athlete', ${vals.status}, ${vals.program},
              ${vals.next_session}, ${vals.week}, ${vals.tier}, ${vals.clerk_user_id}, ${JSON.stringify(profile)}::jsonb, ${vals.id})
      ON CONFLICT (id) DO UPDATE SET
        email=EXCLUDED.email, name=EXCLUDED.name, status=EXCLUDED.status, program=EXCLUDED.program,
        next_session=EXCLUDED.next_session, week=EXCLUDED.week, tier=EXCLUDED.tier,
        clerk_user_id=EXCLUDED.clerk_user_id, profile=EXCLUDED.profile, updated_at=now()`;
    ins++;
  } catch (e) {
    console.log("  skip", email, "-", e.message.slice(0, 80));
    bad++;
  }
}
console.log(`Notion 마스터 ${all.length}건 → upsert ${ins}, 무효/스킵 ${bad}`);
