// lib/whoop/read.js — 화면용 WHOOP 데이터 조회 (선수 포탈·코치 콘솔 공용). 쓰기는 store.js.
// 날짜별 가공·값 상태(기록 없음/계산 중/계산 불가/값 있음)는 days.js.
import { and, eq, gte, lte, desc } from "drizzle-orm";
import { db, schema } from "../db/index.js";
import { getConnection } from "./store.js";
import { buildWhoopDays, sleepTimesForDate } from "./days.js";

const { whoopSleep, whoopRecovery, whoopConnections } = schema;

// 선수 화면에 WHOOP 데이터(요약·차트·홈 카드) 노출 여부. 최종 UI 기획 전까지 false → 코치 패널에서만 확인.
// 연결/해제/재연결 안내는 이 값과 무관하게 선수에게 보임.
export const SHOW_WHOOP_DATA_TO_ATHLETES = false;

// 연결 상태: 'none' | 'active' | 'needs_reauth' | 'revoked'
export async function getWhoopStatus(email) {
  const conn = await getConnection(email);
  return {
    status: conn?.status || "none",
    connectedAt: conn?.connectedAt || null,
    lastCheckedAt: conn?.lastCheckedAt || null,     // 마지막 WHOOP 직접 확인(동기화) 시각
    lastCheckSource: conn?.lastCheckSource || null, // auto | manual
  };
}

// 지울 WHOOP 데이터가 남아 있는지 (연결 행 또는 수면·회복 기록) — 코칭 종료 후 삭제 버튼 표시용
export async function hasWhoopData(email) {
  if (!email) return false;
  const [c] = await db.select({ id: whoopConnections.id }).from(whoopConnections).where(eq(whoopConnections.userEmail, email)).limit(1);
  if (c) return true;
  const [sl] = await db.select({ id: whoopSleep.sleepId }).from(whoopSleep).where(eq(whoopSleep.userEmail, email)).limit(1);
  if (sl) return true;
  const [r] = await db.select({ id: whoopRecovery.cycleId }).from(whoopRecovery).where(eq(whoopRecovery.userEmail, email)).limit(1);
  return !!r;
}

// 코치 대시보드용: { 이메일(소문자): status } 한 번에. 실패해도 대시보드는 떠야 하므로 빈 객체.
export async function getWhoopStatusMap() {
  try {
    const rows = await db.select({ email: whoopConnections.userEmail, status: whoopConnections.status }).from(whoopConnections);
    return Object.fromEntries(rows.map((r) => [String(r.email).toLowerCase(), r.status]));
  } catch (e) {
    console.error("getWhoopStatusMap failed:", e?.message);
    return {};
  }
}

// 최근 N일(기록 없는 날 포함) 메인 수면 + 그 수면의 회복. 오래된 날 → 최신 날 순.
export async function getWhoopDays(email, days = 14) {
  if (!email) return [];
  const since = new Date(Date.now() - (days + 1) * 86400000);
  const [sleeps, recs] = await Promise.all([
    db.select().from(whoopSleep)
      .where(and(eq(whoopSleep.userEmail, email), eq(whoopSleep.isNap, false), gte(whoopSleep.endTs, since)))
      .orderBy(desc(whoopSleep.endTs)),
    db.select().from(whoopRecovery).where(eq(whoopRecovery.userEmail, email)),
  ]);
  return buildWhoopDays(sleeps, recs, days);
}

// 수면일지 미리 채우기 — 그 기상일의 WHOOP 누운·깬 시각. 시간대 차이를 감안해 앞뒤 하루씩 넓게 조회 후 현지 날짜로 거름.
export async function getWhoopSleepTimes(email, date) {
  if (!email || !/^\d{4}-\d{2}-\d{2}$/.test(date || "")) return null;
  const day = Date.parse(date + "T00:00:00Z");
  const sleeps = await db.select().from(whoopSleep)
    .where(and(eq(whoopSleep.userEmail, email), eq(whoopSleep.isNap, false),
      gte(whoopSleep.endTs, new Date(day - 86400000)), lte(whoopSleep.endTs, new Date(day + 2 * 86400000))));
  return sleepTimesForDate(sleeps, date);
}
