// lib/whoop/read.js — 화면용 WHOOP 데이터 조회 (선수 포탈·코치 콘솔 공용). 쓰기는 store.js.
// 날짜 기준 = 기상일(선수 현지 tz_offset). 낮잠 제외, 메인 수면만.
// score_state ≠ SCORED면 값은 null 그대로 → 화면에서 "미정" (없는 값 임의로 그리기 금지).
import { and, eq, gte, desc } from "drizzle-orm";
import { db, schema } from "../db/index.js";
import { getConnection } from "./store.js";

const { whoopSleep, whoopRecovery } = schema;

// "+09:00" → 분
function offsetMin(tz) {
  const m = /^([+-])(\d{2}):?(\d{2})$/.exec(tz || "");
  if (!m) return 9 * 60; // 정보 없으면 한국 기준
  return (m[1] === "-" ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3]));
}

// 현지 기준 날짜(YYYY-MM-DD) + 시:분(자정 기준 분)
function localParts(ts, tz) {
  if (!ts) return { date: null, min: null };
  const d = new Date(new Date(ts).getTime() + offsetMin(tz) * 60000);
  return { date: d.toISOString().slice(0, 10), min: d.getUTCHours() * 60 + d.getUTCMinutes() };
}

// 연결 상태: 'none' | 'active' | 'needs_reauth' | 'revoked'
export async function getWhoopStatus(email) {
  const conn = await getConnection(email);
  return { status: conn?.status || "none", connectedAt: conn?.connectedAt || null };
}

// 최근 N일 메인 수면 + 그 수면의 회복. 오래된 날 → 최신 날 순.
export async function getWhoopDays(email, days = 14) {
  if (!email) return [];
  const since = new Date(Date.now() - (days + 1) * 86400000);
  const [sleeps, recs] = await Promise.all([
    db.select().from(whoopSleep)
      .where(and(eq(whoopSleep.userEmail, email), eq(whoopSleep.isNap, false), gte(whoopSleep.endTs, since)))
      .orderBy(desc(whoopSleep.endTs)),
    db.select().from(whoopRecovery).where(eq(whoopRecovery.userEmail, email)),
  ]);
  const recBySleep = Object.fromEntries(recs.filter((r) => r.sleepId).map((r) => [r.sleepId, r]));

  const byDate = new Map(); // 하루에 메인 수면 2개면 최신(endTs 큰 것)만
  for (const s of sleeps) {
    const wake = localParts(s.endTs, s.tzOffset);
    if (!wake.date || byDate.has(wake.date)) continue;
    const bed = localParts(s.startTs, s.tzOffset);
    const r = recBySleep[s.sleepId] || null;
    const sleepScored = s.scoreState === "SCORED";
    const recScored = r?.scoreState === "SCORED";
    const asleepMs = sleepScored ? (s.lightMs || 0) + (s.swsMs || 0) + (s.remMs || 0) : null;
    byDate.set(wake.date, {
      date: wake.date,
      label: `${Number(wake.date.slice(5, 7))}/${Number(wake.date.slice(8, 10))}`,
      bedMin: bed.min,
      wakeMin: wake.min,
      sleepScored,
      asleepMs,
      deepMs: sleepScored ? s.swsMs : null,
      remMs: sleepScored ? s.remMs : null,
      lightMs: sleepScored ? s.lightMs : null,
      awakeMs: sleepScored ? s.awakeMs : null,
      sleepEffPct: sleepScored ? s.sleepEffPct : null,
      sleepPerfPct: sleepScored ? s.sleepPerfPct : null,
      recScored,
      recoveryScore: recScored ? r.recoveryScore : null,
      hrvMs: recScored ? r.hrvRmssdMs : null,
      restingHr: recScored ? r.restingHr : null,
    });
  }
  return [...byDate.values()].sort((a, b) => (a.date < b.date ? -1 : 1));
}
