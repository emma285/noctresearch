#!/usr/bin/env node
/**
 * 리포트 엔진 · 인용 검증 게이트 (숫자 外 모든 근거를 원본에 강제 대조)
 * ------------------------------------------------------------------
 * 리포트에 쓴 세션 인용·메모 근거·스냅샷 필드를 원본에서 실제로 확인.
 * "숫자만 audit되고 세션 인용은 상속돼 뚫린" 사고(2026-09-08 SpO2) 재발 방지.
 *
 * claims.json의 각 claim.verify:
 *   {kind:"session", session:N, keywords:[...]}  → Neon sessions(해당 client, n=N) 본문에 키워드 전부 존재
 *   {kind:"memo",    dates:[...], keywords:[...]} → 스냅샷 그날 memo에 키워드 ≥1 존재
 *   {kind:"field",   field, dates:[...], equals|oneOf} → 스냅샷 그날 필드값 일치
 * 하나라도 불성립 → exit 1 (발행 중단).
 *
 * 사용: DBURL=<Neon> node verify-citations.mjs <config.json> <snapshot.json> <claims.json>
 */
import { neon } from "@neondatabase/serverless";
import { readFileSync } from "node:fs";

const [cfgP, snapP, claimsP] = process.argv.slice(2);
if (!cfgP || !snapP || !claimsP) { console.error("사용: node verify-citations.mjs <config> <snapshot> <claims>"); process.exit(2); }
const cfg = JSON.parse(readFileSync(cfgP, "utf8"));
const snap = JSON.parse(readFileSync(snapP, "utf8"));
const spec = JSON.parse(readFileSync(claimsP, "utf8"));
const byDate = new Map(snap.nights.map((n) => [n.date, n]));
const DBURL = process.env.DBURL || process.env.DATABASE_URL;

const results = [];
const add = (level, id, msg) => results.push({ level, id, msg });

// 세션 검증엔 client_id 필요 (email → clients)
let clientId = null, sessionsCache = new Map();
const needSession = (spec.claims || []).some((c) => c.verify?.kind === "session");
if (needSession) {
  if (!DBURL) { add("FAIL", "(setup)", "세션 인용 검증에 DBURL 필요"); }
  else {
    const sql = neon(DBURL);
    const email = spec.client_email || cfg.user;
    const cl = await sql`SELECT id FROM clients WHERE email=${email}`;
    clientId = cl[0]?.id;
    if (!clientId) add("FAIL", "(setup)", `clients에서 ${email} 못 찾음`);
    else {
      const rows = await sql`SELECT n, (coalesce(summary,'')||' '||coalesce(transcript,'')||' '||coalesce(coach_comment,'')||' '||coalesce(action_items,'')||' '||coalesce(guide::text,'')) AS body
        FROM sessions WHERE client_id=${clientId}`;
      for (const r of rows) sessionsCache.set(Number(r.n), r.body || "");
    }
  }
}

for (const c of spec.claims || []) {
  const v = c.verify;
  if (!v) continue; // 숫자류(expect/anomaly)는 audit-report.mjs 담당
  const id = c.id;

  if (v.kind === "session") {
    const body = sessionsCache.get(v.session);
    if (body == null) { add("FAIL", id, `${v.session}차 세션 원본 없음`); continue; }
    const miss = (v.keywords || []).filter((k) => !body.includes(k));
    if (miss.length) add("FAIL", id, `${v.session}차에 없음: ${miss.join(", ")} — 인용 근거 불충분`);
    else add("OK", id, `${v.session}차에서 확인: ${(v.keywords || []).join(", ")}`);
  } else if (v.kind === "memo") {
    let bad = [];
    for (const d of v.dates || []) {
      const n = byDate.get(d);
      if (!n) { bad.push(`${d}(없음)`); continue; }
      if (!(v.keywords || []).some((k) => (n.memo || "").includes(k))) bad.push(`${d}(키워드無)`);
    }
    if (bad.length) add("FAIL", id, `메모 근거 불성립: ${bad.join(", ")} — 기대 키워드 ${(v.keywords || []).join("/")}`);
    else add("OK", id, `메모 확인: ${(v.dates || []).join(", ")}`);
  } else if (v.kind === "field") {
    let bad = [];
    for (const d of v.dates || []) {
      const n = byDate.get(d);
      if (!n) { bad.push(`${d}(없음)`); continue; }
      const got = n[v.field];
      const ok = v.present ? got != null : v.equals != null ? got === v.equals : v.oneOf ? v.oneOf.includes(got) : false;
      if (!ok) bad.push(`${d}.${v.field}=${JSON.stringify(got)}`);
    }
    if (bad.length) add("FAIL", id, `필드 불일치: ${bad.join(", ")} — 기대 ${v.equals ?? (v.oneOf || []).join("|")}`);
    else add("OK", id, `필드 확인: ${v.field} on ${(v.dates || []).length}일`);
  } else {
    add("FAIL", id, `알 수 없는 verify.kind: ${v.kind}`);
  }
}

const icon = { FAIL: "❌", OK: "✅" };
console.log(`\n인용 검증: ${spec.report ?? "(무명)"}`);
console.log("─".repeat(72));
if (!results.length) console.log("검증할 인용(verify) 없음");
for (const r of results) console.log(`${icon[r.level]} [${r.id}] ${r.msg}`);
const fails = results.filter((r) => r.level === "FAIL").length;
console.log("─".repeat(72));
console.log(`${fails ? "❌ 발행 불가" : "✅ 통과"} — FAIL ${fails}\n`);
process.exit(fails ? 1 : 0);
