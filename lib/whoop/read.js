// lib/whoop/read.js — 화면용 WHOOP 데이터 조회 (선수 포탈·코치 콘솔 공용). 쓰기는 store.js.
// 날짜별 가공·값 상태(기록 없음/계산 중/계산 불가/값 있음)는 days.js.
import { and, eq, gte, desc } from "drizzle-orm";
import { db, schema } from "../db/index.js";
import { getConnection } from "./store.js";
import { buildWhoopDays } from "./days.js";

const { whoopSleep, whoopRecovery } = schema;

// 선수 화면에 WHOOP 데이터(요약·차트·홈 카드) 노출 여부. 최종 UI 기획 전까지 false → 코치 패널에서만 확인.
// 연결/해제/재연결 안내는 이 값과 무관하게 선수에게 보임.
export const SHOW_WHOOP_DATA_TO_ATHLETES = false;

// 연결 상태: 'none' | 'active' | 'needs_reauth' | 'revoked'
export async function getWhoopStatus(email) {
  const conn = await getConnection(email);
  return { status: conn?.status || "none", connectedAt: conn?.connectedAt || null };
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
