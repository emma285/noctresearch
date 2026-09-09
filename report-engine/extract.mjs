#!/usr/bin/env node
/**
 * 리포트 엔진 · 추출기 (Neon logs → 동결 snapshot.json)
 * ------------------------------------------------------------------
 * config.json(유저·기간·구간)만 있으면 누구든 스냅샷을 뽑는다. 사람별 하드코딩 X.
 * 기계적 필드(취침·기상·총수면·각성·입면)는 원본에서 계산.
 * 루틴로그(낮잠·운동·음주·식사)를 밤별로 조인.
 * 해석성 필드(cpap 착용·alcohol 여부)는 문서화된 규칙으로 파생 → --check로 회귀 검증.
 *
 * 사용:
 *   node extract.mjs reports/<name>/config.json            # snapshot.json 생성
 *   node extract.mjs reports/<name>/config.json --check A   # 기존 스냅샷 A와 diff (발행 안 함)
 *
 * DB: 환경변수 DBURL (또는 DATABASE_URL) = Neon 접속 URL
 */
import { neon } from "@neondatabase/serverless";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";

const cfgPath = process.argv[2];
const checkIdx = process.argv.indexOf("--check");
const checkPath = checkIdx > -1 ? process.argv[checkIdx + 1] : null;
if (!cfgPath) { console.error("사용: node extract.mjs <config.json> [--check <기존snapshot>]"); process.exit(2); }

const cfg = JSON.parse(readFileSync(cfgPath, "utf8"));
const outPath = join(dirname(cfgPath), "snapshot.json");
// 해석성 오버레이(사람이 그날 메모 읽고 인코딩한 검증값). 있으면 자동 파생보다 우선.
const overlayPath = join(dirname(cfgPath), "overlay.json");
const overlay = existsSync(overlayPath) ? JSON.parse(readFileSync(overlayPath, "utf8")) : null;
const DBURL = process.env.DBURL || process.env.DATABASE_URL;
if (!DBURL) { console.error("환경변수 DBURL(또는 DATABASE_URL) 필요"); process.exit(2); }
const sql = neon(DBURL);

// ── 디코드 헬퍼 (자정기준분) ──
const cont = (b) => (b < 720 ? b : b - 1440);          // 취침 연속화: 저녁=음수, 새벽=양수
const hhmm = (m) => { m = ((Math.round(m) % 1440) + 1440) % 1440; return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`; };
const round2 = (x) => Math.round(x * 100) / 100;
const inRange = (d, [a, b]) => a <= d && d <= b;
const segOf = (d) => (cfg.segments || []).find((s) => inRange(d, s.range))?.label ?? null;

// ── 해석성 파생 규칙 (문서화) ──
const ALC_RE = /술|맥주|와인|음주|소주|위스키|한 ?잔|맥주 ?\d|와인 ?\d/;
function deriveAlcohol(memo, routineAlc) {
  return Boolean(routineAlc) || (memo ? ALC_RE.test(memo) : false);
}
// cpap: 그날 메모에 양압기 언급이 있을 때만 판정. 미언급=null(모름). 지어내지 않음.
function deriveCpap(memo) {
  if (!memo || !/양압기|마스크|cpap/i.test(memo)) return null;
  const removed = /벗어버|벗고 ?자|벗었|중간에 ?벗|자다가.*벗/.test(memo);
  const notWorn = /안 ?하고 ?잤|못 ?하고 ?잤|하지 ?않고 ?잤|설치 ?못|설치를 ?못|안 ?했|착용 ?못/.test(memo);
  const worn = /벗지 ?않고|잘 ?하고 ?잤|착용하고 ?잤|하고 ?잤습니다/.test(memo);
  if (removed) return "removed";
  if (notWorn) return "none";
  if (worn) return "worn";
  return null; // 언급은 있으나 착용 여부 불명
}

// ── 조회 ──
const { user, period } = cfg;
const sleepRows = await sql`SELECT date::text AS date, data FROM logs
  WHERE user_email=${user} AND kind='sleep' AND date BETWEEN ${period.start} AND ${period.end} ORDER BY date`;
const routineRows = await sql`SELECT date::text AS date, data FROM logs
  WHERE user_email=${user} AND kind='routine' AND date BETWEEN ${period.start} AND ${period.end} ORDER BY date, (data->>'time')`;

// 루틴 밤별 조인
const routineByDate = new Map();
for (const r of routineRows) {
  const arr = routineByDate.get(r.date) || [];
  arr.push({ type: r.data.type, time: r.data.time ?? null, detail: r.data.detail || "", dur: r.data.dur || null });
  routineByDate.set(r.date, arr);
}

// ── 밤 객체 생성 ──
const nights = sleepRows.map((row) => {
  const d = row.data;
  const bedMin = d.bed, wakeMin = d.wake;
  const rts = routineByDate.get(row.date) || [];
  const routineAlc = rts.some((x) => x.type === "alcohol");
  const naps = rts.filter((x) => x.type === "nap");
  const trainings = rts.filter((x) => x.type === "training");
  return {
    date: row.date,
    seg: segOf(row.date),
    location: cfg.usSegment && segOf(row.date) === cfg.usSegment ? "US" : "KR",
    bedtime: hhmm(bedMin),
    waketime: hhmm(wakeMin),
    tstHours: round2((wakeMin - cont(bedMin)) / 60),
    bedMin, wakeMin,
    wakeCount: d.woke ?? null,
    awakeBucket: d.waso ?? (d.woke === 0 ? "안깸" : null),
    sol: d.sol ?? null,
    alcohol: deriveAlcohol(d.memo, routineAlc),
    // cpap: 오버레이(사람이 메모 읽은 검증값) 우선. 없으면 자동 규칙 1차 파생(코치 검수용). 지어내지 않음(둘 다 메모 근거).
    cpap: overlay?.cpap ? (overlay.cpap[row.date] ?? null) : deriveCpap(d.memo),
    nap: naps.length ? (naps[0].detail || naps[0].dur || "기록") : null,
    training: trainings.length ? (trainings[0].detail || trainings[0].dur || "기록") : null,
    routines: rts,
    memo: d.memo || "",
  };
});

const snapshot = {
  client: cfg.who || user,
  source: `Neon logs (noctresearch 포탈) ${user} kind=sleep+routine`,
  capturedAt: cfg.capturedAt || null,
  note: `${period.start}~${period.end}. bed/wake=자정기준분 디코드. cpap/alcohol=문서화 규칙 파생(메모·루틴). routine ${routineRows.length}건 조인.`,
  period,
  nights,
};

// ── --check: 기존 스냅샷과 diff (발행 전 회귀 검증) ──
if (checkPath) {
  const prev = JSON.parse(readFileSync(checkPath, "utf8"));
  const prevBy = new Map(prev.nights.map((n) => [n.date, n]));
  const MECH = ["bedtime", "waketime", "tstHours", "bedMin", "wakeMin", "wakeCount", "awakeBucket", "sol"];
  const INTERP = ["alcohol", "cpap", "location"];
  let mech = 0, interp = 0;
  console.log(`\n=== diff: 새 추출 vs ${checkPath} ===`);
  for (const n of nights) {
    const p = prevBy.get(n.date);
    if (!p) { console.log(`  + ${n.date} 새 밤(기존에 없음)`); continue; }
    for (const f of MECH) if (JSON.stringify(n[f]) !== JSON.stringify(p[f])) { console.log(`  ⚠ MECH ${n.date}.${f}: 새=${JSON.stringify(n[f])} 기존=${JSON.stringify(p[f])}`); mech++; }
    for (const f of INTERP) if (JSON.stringify(n[f]) !== JSON.stringify(p[f])) { console.log(`  · interp ${n.date}.${f}: 새=${JSON.stringify(n[f])} 기존=${JSON.stringify(p[f])}`); interp++; }
  }
  const onlyPrev = prev.nights.filter((p) => !nights.find((n) => n.date === p.date)).map((p) => p.date);
  if (onlyPrev.length) console.log(`  - 기존에만 있던 밤: ${onlyPrev.join(", ")}`);
  console.log(`\n기계필드 불일치 ${mech} · 해석필드 불일치 ${interp} · 새박수 ${nights.length} vs 기존 ${prev.nights.length}`);
  console.log(mech ? "❌ 기계필드가 어긋남 — 디코드 로직 점검 필요" : "✅ 기계필드 일치 (추출 로직 OK)");
  process.exit(0);
}

writeFileSync(outPath, JSON.stringify(snapshot, null, 2) + "\n");
console.log(`✅ ${outPath} — ${nights.length}박, 루틴 ${routineRows.length}건 조인`);
