// lib/whoop/days.js — DB에서 읽은 수면·회복 행 → 날짜별 화면 데이터. (DB·HTTP 없음 → 테스트 쉬움)
// 날짜 기준 = 기상일(선수 현지 tz_offset). 낮잠 제외, 메인 수면만.
//
// 값 상태(수면·회복 각각):
//   none       기록 없음 — 그날 기록 자체가 없음(미착용 등)
//   pending    계산 중   — 기록은 있으나 WHOOP 점수 계산 전(PENDING_SCORE) → 웹훅으로 자동 채워짐
//   unscorable 계산 불가 — 기록은 있으나 WHOOP가 점수 산출 불가 판정(UNSCORABLE) → 계속 빈 값
//   scored     값 있음   — 계산 완료(SCORED). 0도 실제 측정값
// none/pending/unscorable이면 값은 전부 null. null을 0으로 바꾸지 않는다(없는 데이터 임의로 그리기 금지).

export function scoreStateOf(row) {
  if (!row) return "none";
  if (row.scoreState === "SCORED") return "scored";
  if (row.scoreState === "UNSCORABLE") return "unscorable";
  return "pending"; // PENDING_SCORE
}

// "+09:00" → 분
function offsetMin(tz) {
  const m = /^([+-])(\d{2}):?(\d{2})$/.exec(tz || "");
  if (!m) return 9 * 60; // 정보 없으면 한국 기준
  return (m[1] === "-" ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3]));
}

// 현지 기준 날짜(YYYY-MM-DD) + 시:분(자정 기준 분)
export function localParts(ts, tz) {
  if (!ts) return { date: null, min: null };
  const d = new Date(new Date(ts).getTime() + offsetMin(tz) * 60000);
  return { date: d.toISOString().slice(0, 10), min: d.getUTCHours() * 60 + d.getUTCMinutes() };
}

const addDays = (date, n) => new Date(Date.parse(date + "T00:00:00Z") + n * 86400000).toISOString().slice(0, 10);
const labelOf = (date) => `${Number(date.slice(5, 7))}/${Number(date.slice(8, 10))}`;
// 하나라도 null이면 합계도 null (0으로 채우지 않음)
const sumOrNull = (...xs) => (xs.some((x) => x == null) ? null : xs.reduce((a, b) => a + b, 0));

function emptyDay(date) {
  return {
    date, label: labelOf(date), bedMin: null, wakeMin: null,
    sleepState: "none", sleepScored: false,
    asleepMs: null, deepMs: null, remMs: null, lightMs: null, awakeMs: null, sleepEffPct: null, sleepPerfPct: null,
    recState: "none", recScored: false,
    recoveryScore: null, hrvMs: null, restingHr: null,
  };
}

// 최근 days일을 빠짐없이(기록 없는 날 포함) 오래된 날 → 최신 날 순으로.
// 오늘은 기록이 있을 때만 포함(아직 자는 중일 수 있으므로 "기록 없음"으로 단정하지 않음).
export function buildWhoopDays(sleeps, recs, days = 14, now = new Date()) {
  const main = sleeps.filter((s) => s.isNap === false && s.endTs)
    .sort((a, b) => new Date(b.endTs) - new Date(a.endTs));
  const recBySleep = Object.fromEntries(recs.filter((r) => r.sleepId).map((r) => [r.sleepId, r]));

  const byDate = new Map(); // 하루에 메인 수면 2개면 최신(endTs 큰 것)만
  for (const s of main) {
    const wake = localParts(s.endTs, s.tzOffset);
    if (byDate.has(wake.date)) continue;
    const r = recBySleep[s.sleepId] || null;
    const sleepState = scoreStateOf(s);
    const recState = scoreStateOf(r);
    const sOk = sleepState === "scored";
    const rOk = recState === "scored";
    byDate.set(wake.date, {
      date: wake.date,
      label: labelOf(wake.date),
      bedMin: localParts(s.startTs, s.tzOffset).min,
      wakeMin: wake.min,
      sleepState,
      sleepScored: sOk,
      asleepMs: sOk ? sumOrNull(s.lightMs, s.swsMs, s.remMs) : null,
      deepMs: sOk ? s.swsMs : null,
      remMs: sOk ? s.remMs : null,
      lightMs: sOk ? s.lightMs : null,
      awakeMs: sOk ? s.awakeMs : null,
      sleepEffPct: sOk ? s.sleepEffPct : null,
      sleepPerfPct: sOk ? s.sleepPerfPct : null,
      recState,
      recScored: rOk,
      recoveryScore: rOk ? r.recoveryScore : null,
      hrvMs: rOk ? r.hrvRmssdMs : null,
      restingHr: rOk ? r.restingHr : null,
    });
  }

  const today = localParts(now, main[0]?.tzOffset).date;
  const out = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = addDays(today, -i);
    if (byDate.has(date)) out.push(byDate.get(date));
    else if (date !== today) out.push(emptyDay(date));
  }
  return out;
}

// 수면일지 미리 채우기용 — 그 기상일(선수 현지 tz_offset)의 메인 수면 누운 시각·깬 시각(자정 기준 분).
// 하루에 메인 수면이 2개면 최신(endTs 큰 것). 없으면 null. 점수 계산 전이어도 시각은 있으므로 사용.
export function sleepTimesForDate(sleeps, date) {
  const s = sleeps.filter((x) => x.isNap === false && x.startTs && x.endTs && localParts(x.endTs, x.tzOffset).date === date)
    .sort((a, b) => new Date(b.endTs) - new Date(a.endTs))[0];
  if (!s) return null;
  return { bedMin: localParts(s.startTs, s.tzOffset).min, wakeMin: localParts(s.endTs, s.tzOffset).min };
}
