// lib/targets.js — 하루별 목표 수면(sleep_targets) 조회 + "목표 vs 실제" 순응도 계산.
// bed/wake = 자정 기준 분(logs.data와 동일). date = 기상일 기준(로그와 정렬).
import { eq } from "drizzle-orm";
import { db, schema } from "./db/index.js";

const { sleepTargets } = schema;
const day10 = (s) => (s ? String(s).slice(0, 10) : "");

// 선수의 목표 목록 (선택 날짜범위). 행 수가 적어 JS에서 필터.
export async function getSleepTargets(clientId, fromDate, toDate) {
  if (!clientId) return [];
  try {
    const rows = await db.select().from(sleepTargets).where(eq(sleepTargets.clientId, clientId));
    return rows
      .map((r) => ({ date: day10(r.date), bed: r.bedMin, wake: r.wakeMin, label: r.label || "" }))
      .filter((r) => r.date && (!fromDate || r.date >= fromDate) && (!toDate || r.date <= toDate))
      .sort((a, b) => (a.date < b.date ? -1 : 1));
  } catch (e) {
    console.error("getSleepTargets failed:", e?.message);
    return [];
  }
}

// 목표 vs 실제 순응도 요약 — 목표 있는 날 중 실제 로그가 있는 날만 집계.
// 반환: { days, wakeAvg, bedAvg } (분, 음수=일찍/이르게). 매칭 없으면 null.
export function adherence(targets = [], sleepsByDate = {}) {
  const wake = [], bed = [];
  for (const t of targets) {
    const a = sleepsByDate[t.date];
    if (!a) continue;
    if (typeof a.wake === "number" && typeof t.wake === "number") wake.push(a.wake - t.wake);
    if (typeof a.bed === "number" && typeof t.bed === "number") bed.push(a.bed - t.bed);
  }
  if (!wake.length && !bed.length) return null;
  const avg = (arr) => (arr.length ? Math.round(arr.reduce((s, x) => s + x, 0) / arr.length) : null);
  return { days: Math.max(wake.length, bed.length), wakeAvg: avg(wake), bedAvg: avg(bed) };
}
