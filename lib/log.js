// lib/log.js — 수면·루틴 로그 조회 (기록 탭 서버 컴포넌트용). 저장소 = Neon(logs).
// api/log GET과 같은 소스(user_email=이메일 키).
import { and, eq, gte, lt, lte, asc, desc } from "drizzle-orm";
import { db, schema } from "./db/index.js";

const { logs } = schema;

// "HH:MM" → 분. 실패 시 null.
const parseTime = (s) => { const m = /^(\d{1,2}):(\d{2})/.exec(s || ""); return m ? +m[1] * 60 + +m[2] : null; };
// 루틴 소요시간 라벨 → 대략 분(블록 높이용). 없으면 30.
function durToMin(s) {
  if (!s) return 30;
  const str = String(s);
  if (/하루종일/.test(str)) return 240;
  if (/반나절/.test(str)) return 180;
  let m = 0; const h = /(\d+)\s*시간/.exec(str); const mm = /(\d+)\s*분/.exec(str);
  if (h) m += +h[1] * 60; if (mm) m += +mm[1];
  return m || 30;
}
const kstAdd = (iso, n) => new Date(Date.parse(iso + "T00:00:00Z") + n * 86400000).toISOString().slice(0, 10);

// 세션 가이드용 타임라인 데이터 — 최근 numDays일 + 오프셋용 앞 1일.
// { cols:[날짜...], sleeps:[{date,bed,sol,wake,out,feel,memo,woke,waso}], routines:[{date,t,type,d,dur}] }
export async function getLogTimeline(email, endDate, numDays = 4) {
  const end = endDate || kstToday();
  const cols = [];
  for (let i = numDays; i >= 0; i--) cols.push(kstAdd(end, -i)); // 첫 칸 = 오프셋용
  if (!email) return { cols, sleeps: [], routines: [] };
  try {
    const rows = await db.select().from(logs)
      .where(and(eq(logs.userEmail, email), gte(logs.date, cols[0]), lte(logs.date, end)))
      .orderBy(asc(logs.date));
    const sleeps = [], routines = [];
    for (const p of rows) {
      const d = p.data || {};
      if (p.kind === "sleep") sleeps.push({ date: p.date, bed: d.bed, sol: d.sol ?? null, wake: d.wake, out: d.outbed ?? null, feel: (d.feel || []).join(", "), memo: d.memo || "", woke: d.woke ?? 0, waso: d.waso ?? null, tz: d.tz || null, bedTz: d.bedTz || null, wakeTz: d.wakeTz || null });
      else routines.push({ date: p.date, t: parseTime(d.time), type: d.type || "etc", d: [d.detail, d.dur].filter(Boolean).join("·"), dur: durToMin(d.dur), tz: d.tz || null });
    }
    return { cols, sleeps: sleeps.filter((s) => s.bed != null && s.wake != null), routines: routines.filter((r) => r.t != null) };
  } catch (e) {
    console.error("getLogTimeline failed:", e?.message);
    return { cols, sleeps: [], routines: [] };
  }
}

// KST 기준 오늘 YYYY-MM-DD (프로덕션 UTC 서버 대비 +9h)
export function kstToday() {
  return new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
}

// 선수의 최근 로그 tz (없으면 null) — 세션 시간 현지 환산·D-day 계산용.
export async function getLatestLogTz(email) {
  if (!email) return null;
  try {
    const rows = await db.select({ data: logs.data }).from(logs)
      .where(eq(logs.userEmail, email)).orderBy(desc(logs.createdAt)).limit(8);
    for (const r of rows) { const tz = r.data?.wakeTz || r.data?.tz; if (tz) return tz; }
    return null;
  } catch (e) {
    console.error("getLatestLogTz failed:", e?.message);
    return null;
  }
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
      else blocks.push({ nid: p.id, time: data.time, type: data.type, detail: data.detail, dur: data.dur, text: data.text, tz: data.tz || null });
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
