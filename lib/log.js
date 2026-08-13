// lib/log.js — 수면·루틴 로그 조회 (기록 탭 서버 컴포넌트용). 저장소 = Neon(logs).
// api/log GET과 같은 소스(user_email=이메일 키).
import { and, eq, gte, lt, asc } from "drizzle-orm";
import { db, schema } from "./db/index.js";

const { logs } = schema;

// KST 기준 오늘 YYYY-MM-DD (프로덕션 UTC 서버 대비 +9h)
export function kstToday() {
  return new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
}

// 특정 날짜의 전체 기록 → { sleep: {summary,data}|null, blocks: [{nid,time,type,detail,dur,text}] }
export async function getDayEntries(email, date) {
  if (!email || !date) return { sleep: null, blocks: [] };
  try {
    const rows = await db.select().from(logs)
      .where(and(eq(logs.userEmail, email), eq(logs.date, date)))
      .orderBy(asc(logs.createdAt));
    let sleep = null;
    const blocks = [];
    for (const p of rows) {
      const data = p.data || {};
      if (p.kind === "sleep") sleep = { summary: p.summary || "", data };
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
  if (!email) return {};
  try {
    const where = [eq(logs.userEmail, email)];
    if (month && /^\d{4}-\d{2}$/.test(month)) {
      const [y, m] = month.split("-").map(Number);
      const nm = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
      where.push(gte(logs.date, `${month}-01`), lt(logs.date, `${nm}-01`));
    }
    const rows = await db.select({ date: logs.date, kind: logs.kind, summary: logs.summary }).from(logs).where(and(...where));
    const days = {};
    for (const p of rows) {
      if (!p.date) continue;
      if (!days[p.date]) days[p.date] = { sleep: false, routine: 0, sleepSummary: "" };
      if (p.kind === "sleep") { days[p.date].sleep = true; if (p.summary) days[p.date].sleepSummary = p.summary; }
      else days[p.date].routine += 1;
    }
    return days;
  } catch (e) {
    console.error("getLogDays failed:", e?.message);
    return {};
  }
}
