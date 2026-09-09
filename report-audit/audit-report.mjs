#!/usr/bin/env node
/**
 * 리포트 발행 전 감사 게이트 (data ↔ 해석 정합 검증)
 * ------------------------------------------------------------------
 * 리포트에 쓴 모든 숫자·라벨·인과문장이 "동결된 원본(snapshot)"에서
 * 계산/인용되는지 기계적으로 검사한다. 하나라도 실패하면 exit 1 → 발행 중단.
 *
 * 불변식: 리포트의 사실 주장은 원본 행에서만 나온다.
 *         특히 특이점(아웃라이어)의 원인은 그 날 메모/플래그에서만 읽는다.
 *         구간 인상으로 추론 금지.
 *
 * 사용:
 *   node audit-report.mjs <snapshot.json> <claims.json>
 *
 * 파일 스키마는 같은 폴더 README.md 참조.
 */

import { readFileSync } from "node:fs";

const [snapPath, claimsPath] = process.argv.slice(2);
if (!snapPath || !claimsPath) {
  console.error("사용: node audit-report.mjs <snapshot.json> <claims.json>");
  process.exit(2);
}

const snap = JSON.parse(readFileSync(snapPath, "utf8"));
const spec = JSON.parse(readFileSync(claimsPath, "utf8"));

const nights = snap.nights ?? [];
const byDate = new Map(nights.map((n) => [n.date, n]));
const dates = nights.map((n) => n.date).sort();
const snapMin = dates[0];
const snapMax = dates[dates.length - 1];

const results = []; // {level:'FAIL'|'WARN'|'OK', claim, msg}
const add = (level, claim, msg) => results.push({ level, claim, msg });

// ── 특이점 판정 ──────────────────────────────────────────────
function isAnomaly(night, anomaly) {
  if (!night) return false;
  if (anomaly.bucket) return night.awakeBucket === anomaly.bucket;
  if (anomaly.minAwake != null) return (night.awakeMin ?? -1) >= anomaly.minAwake;
  if (anomaly.field && anomaly.op && anomaly.value != null) {
    const v = night[anomaly.field];
    if (v == null) return false;
    return anomaly.op === ">=" ? v >= anomaly.value
         : anomaly.op === ">"  ? v >  anomaly.value
         : anomaly.op === "<=" ? v <= anomaly.value
         : anomaly.op === "<"  ? v <  anomaly.value
         : v === anomaly.value;
  }
  return false;
}

// 원인(cause)이 그날 행에서 실제로 성립하는지
function causeHolds(night, cause) {
  const misses = [];
  for (const [k, want] of Object.entries(cause)) {
    const key = k.replace(/^or_/, "");
    const got = night[key];
    if (got == null) misses.push(`${key}=미상(null)`);
    else if (got !== want) misses.push(`${key}=${JSON.stringify(got)}(기대 ${JSON.stringify(want)})`);
  }
  // or_* 접두 필드는 하나만 맞아도 OK
  const orKeys = Object.keys(cause).filter((k) => k.startsWith("or_"));
  if (orKeys.length) {
    const anyOr = orKeys.some((k) => night[k.slice(3)] === cause[k]);
    const hardMiss = Object.entries(cause)
      .filter(([k]) => !k.startsWith("or_"))
      .some(([k, want]) => night[k] !== want);
    return anyOr && !hardMiss ? [] : misses;
  }
  return misses;
}

// ── 1) 커버리지: 스냅샷이 리포트 기간을 덮는가 ────────────────
const period = spec.period ?? {};
if (period.start && snapMin && period.start < snapMin)
  add("FAIL", "coverage", `리포트 시작 ${period.start} < 스냅샷 최소 ${snapMin} — 앞부분 원본 없음`);
if (period.end && snapMax && period.end > snapMax)
  add("FAIL", "coverage", `리포트 끝 ${period.end} > 스냅샷 최대 ${snapMax} — ${snapMax} 이후 원본 없음(재검증 불가)`);
if (!nights.length) add("FAIL", "coverage", "스냅샷에 야간 기록이 0건");

// ── 2) 클레임별 검사 ─────────────────────────────────────────
for (const c of spec.claims ?? []) {
  const id = c.id ?? c.text?.slice(0, 24) ?? "(무명)";

  if (!["fact", "interpretation", "hypothesis"].includes(c.type))
    add("FAIL", id, `type가 fact|interpretation|hypothesis 중 하나여야 함 (현재: ${c.type})`);

  if (c.type === "hypothesis")
    add("WARN", id, "가설: 리포트에서 사실처럼 단정하지 말 것(‘~일 수 있어요/확인 필요’ 톤)");

  // 근거 날짜 존재 확인
  const ev = c.evidenceDates ?? [];
  const missing = ev.filter((d) => !byDate.has(d));
  if (missing.length) add("FAIL", id, `근거 날짜가 스냅샷에 없음: ${missing.join(", ")}`);

  // 숫자 재계산 (expect)
  if (c.expect) {
    const { field, op, value, dates: exDates } = c.expect;
    const pool = exDates ? exDates.map((d) => byDate.get(d)).filter(Boolean) : nights;
    const vals = pool.map((n) => n?.[field]).filter((v) => typeof v === "number");
    if (!vals.length) add("FAIL", id, `expect: '${field}' 계산할 데이터 없음`);
    else {
      const median = (a) => { const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
      const got = c.expect.agg === "sum" ? vals.reduce((a, b) => a + b, 0)
                : c.expect.agg === "max" ? Math.max(...vals)
                : c.expect.agg === "min" ? Math.min(...vals)
                : c.expect.agg === "median" ? median(vals)
                : vals.reduce((a, b) => a + b, 0) / vals.length; // mean 기본
        const ok = op === ">=" ? got >= value : op === "<=" ? got <= value
                 : op === ">" ? got > value : op === "<" ? got < value
                 : Math.abs(got - value) < (c.expect.tol ?? 0.5);
      add(ok ? "OK" : "FAIL", id, `expect ${field} ${c.expect.agg ?? "mean"} = ${Math.round(got * 10) / 10} (${op} ${value})`);
    }
  }

  // 특이점 원인 주장 — 핵심 게이트
  if (c.kind === "anomaly_cause") {
    if (!c.anomaly || !c.cause) { add("FAIL", id, "anomaly_cause엔 anomaly와 cause 정의 필수"); continue; }
    const actual = nights.filter((n) => isAnomaly(n, c.anomaly)).map((n) => n.date);

    if (!ev.length) {
      add("FAIL", id, `특이점 원인 주장인데 근거 날짜 0개. 스냅샷에서 조건 충족일=${actual.length ? actual.join(", ") : "없음(재검증 불가)"}`);
    }
    for (const d of ev) {
      const n = byDate.get(d);
      if (!n) continue; // 위에서 이미 FAIL
      if (!isAnomaly(n, c.anomaly))
        add("FAIL", id, `${d}는 특이일 아님(조건 불충족) — 강조 근거 없음`);
      const miss = causeHolds(n, c.cause);
      if (miss.length)
        add("FAIL", id, `${d} 원인 불성립: ${miss.join(" / ")} · 그날 메모="${(n.memo ?? "").slice(0, 40)}"`);
    }
    const uncited = actual.filter((d) => !ev.includes(d));
    if (uncited.length) add("WARN", id, `언급 안 된 실제 특이일: ${uncited.join(", ")}`);
  }
}

// ── 출력 ─────────────────────────────────────────────────────
const icon = { FAIL: "❌", WARN: "⚠️ ", OK: "✅" };
console.log(`\n리포트 감사: ${spec.report ?? "(무명)"}  |  스냅샷 ${snapMin}~${snapMax} (${nights.length}박)`);
console.log("─".repeat(72));
for (const r of results) console.log(`${icon[r.level]} [${r.claim}] ${r.msg}`);
const fails = results.filter((r) => r.level === "FAIL").length;
const warns = results.filter((r) => r.level === "WARN").length;
console.log("─".repeat(72));
console.log(`${fails ? "❌ 발행 불가" : "✅ 통과"} — FAIL ${fails} · WARN ${warns}\n`);
process.exit(fails ? 1 : 0);
