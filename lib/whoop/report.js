// lib/whoop/report.js — 저장된 WHOOP 원본(raw)으로 코치용 리포트 데이터 생성.
// report_sample/report_data.py 를 앱으로 옮긴 것(수면·회복 부분).
// 사이클(하루 Strain·걸음 수)·운동 기록은 아직 저장하지 않아 낮 활동 항목은 비어 있음 → 리포트에서 해당 묶음은 숨김.
import { and, eq, desc } from "drizzle-orm";
import { db, schema } from "../db/index.js";

const { whoopSleep, whoopRecovery, whoopCycle, whoopWorkout } = schema;
const WD = "월화수목금토일";
const EVENING_H = 19;

const offMin = (off) => {
  if (!off) return 0;
  const sg = off[0] === "-" ? -1 : 1;
  return sg * (Number(off.slice(1, 3)) * 60 + Number(off.slice(4, 6)));
};
// WHOOP 시각(UTC) → 그 기록이 찍힌 현지 벽시계. 이후 getUTC*로 읽으면 현지 시각이 된다.
const locMs = (ts, off) => Date.parse(ts) + offMin(off) * 60000;
const isoOf = (ms) => new Date(ms).toISOString().slice(0, 10);
const hhmm = (ms) => new Date(ms).toISOString().slice(11, 16);
const min18 = (ms) => { const d = new Date(ms); return (d.getUTCHours() * 60 + d.getUTCMinutes() - 18 * 60 + 1440) % 1440; };
const wdOf = (iso) => WD[(new Date(iso + "T00:00:00Z").getUTCDay() + 6) % 7];
const mdOf = (iso) => `${iso.slice(5, 7)}/${iso.slice(8, 10)}`;
const mn = (ms) => ms / 60000;
const addDays = (iso, n) => { const t = new Date(iso + "T00:00:00Z"); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10); };
const dayDiff = (a, b) => Math.round((Date.parse(a + "T00:00:00Z") - Date.parse(b + "T00:00:00Z")) / 86400000);
const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;

// 최근 30일 평균 대비 차이(기록 3일 미만이면 null) — '평소와 비교' 섹션용
function baseline(nights, get) {
  const out = {}, hist = [];
  for (const iso of nights) {
    const x = get(iso);
    if (x == null) { out[iso] = [null, null]; continue; }
    const prev = hist.filter(([pd]) => dayDiff(iso, pd) <= 30).map(([, y]) => y);
    out[iso] = prev.length >= 3 ? [x - mean(prev), mean(prev)] : [null, null];
    hist.push([iso, x]);
  }
  return out;
}

/**
 * 선수 한 명의 리포트 데이터. 템플릿이 쓰는 키(rows·drows·weeks·naps·openDays·eveningH)만 만든다.
 * @returns {null|object} 점수가 매겨진 밤잠이 하나도 없으면 null
 */
export async function buildReportData(email) {
  const [sleeps, recoveries, cycles, workouts] = await Promise.all([
    db.select({ raw: whoopSleep.raw }).from(whoopSleep).where(eq(whoopSleep.userEmail, email)).orderBy(desc(whoopSleep.endTs)),
    db.select({ raw: whoopRecovery.raw, sleepId: whoopRecovery.sleepId }).from(whoopRecovery).where(eq(whoopRecovery.userEmail, email)),
    db.select({ raw: whoopCycle.raw }).from(whoopCycle).where(eq(whoopCycle.userEmail, email)),
    db.select({ raw: whoopWorkout.raw }).from(whoopWorkout).where(eq(whoopWorkout.userEmail, email)),
  ]);
  return buildFromRaw(sleeps.map((r) => r.raw), recoveries, cycles.map((r) => r.raw), workouts.map((r) => r.raw));
}

/** DB 조회와 분리(테스트용) — sleepRaws: WHOOP 수면 원본 배열, recoveries: {sleepId, raw} 배열 */
export function buildFromRaw(sleepRaws, recoveries, cycleRaws = [], workoutRaws = []) {
  const sleeps = sleepRaws.map((raw) => ({ raw }));
  const recBySleep = new Map(recoveries.filter((r) => r.sleepId).map((r) => [r.sleepId, r.raw]));

  // 밤잠만, 날짜 = 깬 날(현지). 같은 날 두 번이면 나중 기록 우선.
  const nightBy = new Map();
  let naps = 0;
  for (const { raw: s } of sleeps) {
    if (!s || !s.id) continue;
    if (s.nap) { naps++; continue; }
    if (s.score_state !== "SCORED" || !s.score) continue;
    const iso = isoOf(locMs(s.end, s.timezone_offset));
    if (!nightBy.has(iso)) nightBy.set(iso, s);
  }
  const nights = [...nightBy.keys()].sort();
  if (!nights.length) return null;

  const scoreOf = (iso) => nightBy.get(iso).score;
  const stageOf = (iso) => scoreOf(iso).stage_summary || {};
  const recOf = (iso) => {
    const night = nightBy.get(iso);
    if (!night) return null;
    const r = recBySleep.get(night.id);
    return r && r.score_state === "SCORED" ? r.score : null;
  };
  const actualOf = (iso) => {
    const st = stageOf(iso);
    return st.total_light_sleep_time_milli + st.total_slow_wave_sleep_time_milli + st.total_rem_sleep_time_milli;
  };

  const bHrv = baseline(nights, (d) => recOf(d)?.hrv_rmssd_milli ?? null);
  const bRhr = baseline(nights, (d) => recOf(d)?.resting_heart_rate ?? null);
  const bResp = baseline(nights, (d) => scoreOf(d).respiratory_rate ?? null);
  const bSkin = baseline(nights, (d) => recOf(d)?.skin_temp_celsius ?? null);

  const rows = nights.map((iso) => {
    const s = nightBy.get(iso), sc = s.score, st = sc.stage_summary || {}, nd = sc.sleep_needed || {}, r = recOf(iso);
    const a = actualOf(iso), inBed = st.total_in_bed_time_milli;
    const need = [nd.baseline_milli, nd.need_from_sleep_debt_milli, nd.need_from_recent_strain_milli, nd.need_from_recent_nap_milli];
    return {
      iso, date: mdOf(iso), wd: wdOf(iso),
      bed: min18(locMs(s.start, s.timezone_offset)), wake: min18(locMs(s.end, s.timezone_offset)),
      bedT: hhmm(locMs(s.start, s.timezone_offset)), wakeT: hhmm(locMs(s.end, s.timezone_offset)),
      actual: mn(a), need: need.every((x) => x != null) ? mn(need.reduce((x, y) => x + y, 0)) : null, inbed: mn(inBed),
      deep: (st.total_slow_wave_sleep_time_milli / a) * 100, rem: (st.total_rem_sleep_time_milli / a) * 100,
      recovery: r?.recovery_score ?? null, calibrating: r?.user_calibrating ?? null,
      hrv: r?.hrv_rmssd_milli ?? null, hrvDiff: bHrv[iso][0], hrvBase: bHrv[iso][1],
      rhr: r?.resting_heart_rate ?? null, rhrDiff: bRhr[iso][0], rhrBase: bRhr[iso][1],
      disturb: st.disturbance_count, perf: sc.sleep_performance_percentage, eff: sc.sleep_efficiency_percentage,
      consistency: sc.sleep_consistency_percentage || null,
      baseNeed: mn(nd.baseline_milli ?? 0), debt: mn(nd.need_from_sleep_debt_milli ?? 0),
      strainNeed: mn(nd.need_from_recent_strain_milli ?? 0), napNeed: mn(nd.need_from_recent_nap_milli ?? 0),
      noData: mn(st.total_no_data_time_milli ?? 0), reliab: ((st.total_no_data_time_milli ?? 0) / inBed) * 100,
      awake: mn(st.total_awake_time_milli ?? 0),
      resp: sc.respiratory_rate ?? null, respDiff: bResp[iso][0], respBase: bResp[iso][1],
      skin: r?.skin_temp_celsius ?? null, skinDiff: bSkin[iso][0], skinBase: bSkin[iso][1],
      spo2: r?.spo2_percentage ?? null,
    };
  });

  // === 낮 활동 ===
  // 하루(사이클) 날짜 = 현지 시작 시각 + 12시간의 날짜 (WHOOP의 하루는 전날 저녁에 시작)
  const cycleBy = new Map();
  for (const c of cycleRaws) {
    if (!c || !c.start) continue;
    cycleBy.set(isoOf(locMs(c.start, c.timezone_offset) + 12 * 3600 * 1000), c);
  }
  const woBy = new Map(); // 운동 날짜 = 운동 시작한 날(현지)
  for (const w of workoutRaws) {
    if (!w || !w.start || !w.end) continue;
    const iso = isoOf(locMs(w.start, w.timezone_offset));
    if (!woBy.has(iso)) woBy.set(iso, []);
    woBy.get(iso).push(w);
  }
  const dates = [...new Set([...nights, ...cycleBy.keys()])].sort();
  const scoreOfCycle = (c) => (c && c.score_state === "SCORED" ? c.score : null);

  const drows = [];
  const openDays = []; // 아직 안 끝난 하루(오늘) — Strain·걸음이 확정 전이라 뺀다
  for (const iso of dates) {
    const c = cycleBy.get(iso) || null;
    if (c && !c.end) { openDays.push(iso); continue; }
    const sc = scoreOfCycle(c);
    const nextIso = addDays(iso, 1);
    const next = nightBy.get(nextIso) || null;
    const r = recOf(iso);
    const raws = (woBy.get(iso) || []).slice().sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
    const workouts = raws.map((w) => {
      const ws = w.score_state === "SCORED" ? w.score : null;
      const z = ws?.zone_durations || {};
      return {
        sport: w.sport_name ?? null,
        start: hhmm(locMs(w.start, w.timezone_offset)),
        end: hhmm(locMs(w.end, w.timezone_offset)),
        dur: (Date.parse(w.end) - Date.parse(w.start)) / 60000,
        strain: ws?.strain ?? null,
        z45: mn((z.zone_four_milli ?? 0) + (z.zone_five_milli ?? 0)),
        late: new Date(locMs(w.end, w.timezone_offset)).getUTCHours() >= EVENING_H,
      };
    });
    const gapToBed = raws.length && next
      ? (Date.parse(next.start) - Math.max(...raws.map((w) => Date.parse(w.end)))) / 60000
      : null;
    drows.push({
      iso, date: mdOf(iso), wd: wdOf(iso),
      nextActual: next ? mn(actualOf(nextIso)) : null,
      nextEff: next ? next.score.sleep_efficiency_percentage : null,
      calibrating: r?.user_calibrating ?? null, recovery: r?.recovery_score ?? null,
      strain: sc?.strain ?? null, done: !!(c && c.end),
      steps: c ? (c.step_count ?? sc?.step_count ?? null) : null,
      kcal: sc?.kilojoule != null ? Math.round(sc.kilojoule / 4.184) : null,
      workouts, gapToBed,
    });
  }

  // 주별(월요일 시작): 하루 Strain 합계 + 그 주 마지막 밤의 수면 부채
  const strainOf = (iso) => {
    const c = cycleBy.get(iso);
    if (!c || !c.end) return null;
    return scoreOfCycle(c)?.strain ?? null;
  };
  const weeks = [];
  const byWeek = new Map();
  for (const iso of dates) {
    const mon = addDays(iso, -((new Date(iso + "T00:00:00Z").getUTCDay() + 6) % 7));
    if (!byWeek.has(mon)) byWeek.set(mon, []);
    byWeek.get(mon).push(iso);
  }
  for (const mon of [...byWeek.keys()].sort()) {
    const ds = byWeek.get(mon);
    const vals = ds.map(strainOf).filter((x) => x != null);
    const nightsInWeek = ds.filter((d) => nightBy.has(d));
    const last = nightsInWeek[nightsInWeek.length - 1];
    weeks.push({
      iso: mon, label: `${mdOf(mon)}~${mdOf(addDays(mon, 6))}`,
      strainSum: vals.reduce((x, y) => x + y, 0), nDays: vals.length,
      debt: last ? mn(nightBy.get(last).score.sleep_needed?.need_from_sleep_debt_milli ?? 0) : null,
    });
  }

  return { rows, drows, weeks, naps, openDays, eveningH: EVENING_H };
}
