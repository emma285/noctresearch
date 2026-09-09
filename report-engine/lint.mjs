#!/usr/bin/env node
/**
 * 리포트 엔진 · 톤/디자인 린트 (발행 전 강제 게이트)
 * ------------------------------------------------------------------
 * 메모리(문서)는 회상일 뿐 강제 트리거가 아니라 매번 안 돌아감 → 코드로 박아 매번 실행.
 * report.html을 스캔해 AI티·어색표현·금지표기(톤)와 타일 그리드 orphan(디자인)을 잡는다.
 * FAIL 하나라도 있으면 exit 1 → 발행 중단. (WARN은 통과시키되 표시)
 *
 * 사용: node lint.mjs reports/<name>/report.html
 * 근거 룰: feedback-korean-report-tone · feedback-healthcare-report-title-structure · ~/.claude/CLAUDE.md 한국어 톤
 */
import { readFileSync } from "node:fs";

const path = process.argv[2];
if (!path) { console.error("사용: node lint.mjs <report.html>"); process.exit(2); }
const html = readFileSync(path, "utf8");
// 보이는 텍스트만 추출(스타일/스크립트/태그 제거)
const text = html
  .replace(/<style[\s\S]*?<\/style>/g, " ")
  .replace(/<script[\s\S]*?<\/script>/g, " ")
  .replace(/<[^>]+>/g, " ")
  .replace(/&[a-z]+;/g, " ");

// ── 톤 룰 (visible text 대상) ──
const TONE = [
  { id: "소수점시간", level: "FAIL", re: /±?\d+\.\d+\s*(h|시간)/g, msg: "시간은 '6시간 30분' 형식(소수점 금지)" },
  { id: "소수점수치", level: "WARN", re: /\d+\.\d+\s*(배|점|%|분)/g, msg: "소수점 수치 검토(정수/시분으로)" },
  { id: "박단위",     level: "FAIL", re: /\d+\s*박(?![자])/g,     msg: "'N박' → 'N일'" },
  { id: "emdash",     level: "FAIL", re: /—/g,                   msg: "em dash(—) 금지 · 가운뎃점/쉼표로" },
  { id: "화살표",     level: "FAIL", re: /→/g,                   msg: "화살표(→) 금지 · 문장으로 풀기" },
  { id: "격식혼용",   level: "FAIL", re: /(합니다|입니다|습니다)(?=[\s.,)])/g, msg: "친근체 문서에 격식체 혼용(브랜드=~해요/~예요)" },
  { id: "밤중각성",   level: "WARN", re: /밤중/g,                 msg: "'밤중' → '수면 중'으로 통일 검토" },
  { id: "어색동사",   level: "WARN", re: /벌어졌|출렁/g,          msg: "AI/어색 동사 · 자연스러운 표현으로" },
  { id: "명사형결미", level: "WARN", re: /것입니다|것이었|방법입니다|가능성이 있/g, msg: "명사형/번역투 결미 회피" },
  { id: "한자어",     level: "WARN", re: /무력화|긴장도|순응도|용이하/g, msg: "딱딱한 한자어 · 일상어로" },
  { id: "지시어막연", level: "WARN", re: /이렇게 지내|그런 식으로|이러한/g, msg: "막연한 지시어 · 구체 상태/수치로" },
];

// ── 디자인 룰 ──
const DESIGN = [];
// 타일 그리드 orphan: class="tiles cN"의 실제 .tile 수가 N과 다르면 빈칸/넘침
const wrapRe = /class="tiles(?:\s+c(\d))?"/g;
let m;
while ((m = wrapRe.exec(html))) {
  const n = m[1] ? parseInt(m[1]) : 4;
  const rest = html.slice(m.index);
  const ends = ["</section>", 'class="callout"', 'class="chartnote"']
    .map((s) => rest.indexOf(s)).filter((i) => i > 0);
  const block = rest.slice(0, Math.min(...ends, rest.length));
  const tiles = (block.match(/class="tile"/g) || []).length;
  if (tiles !== n)
    DESIGN.push({ id: "타일그리드", level: "FAIL", msg: `타일 ${tiles}개인데 그리드는 ${n}칸(c${n}) → 빈칸/넘침. class="tiles c${tiles}"로` });
}
// 영어 보조 타이틀/단어 금지 (한국어 리포트에 영어 장식). 고유명사·의학약어는 화이트리스트.
const WHITE = new Set(["NOCT", "RESEARCH", "IPHI", "CPAP", "PSG", "REM", "ESS", "HRV", "SPO", "SPO2", "UARS", "SRI", "WASO", "SOL", "TST", "KPI", "RED", "EPR"]);
const engWords = [...new Set((text.match(/[A-Za-z]{3,}/g) || []).map((w) => w.toUpperCase()))].filter((w) => !WHITE.has(w));
if (engWords.length)
  DESIGN.push({ id: "영어타이틀", level: "FAIL", msg: `영어 보조 타이틀/단어 금지: ${engWords.join(", ")} (고유명사면 lint.mjs WHITE에 추가)` });

// ── 실행 ──
const hits = [];
for (const r of TONE) {
  const found = [...text.matchAll(r.re)];
  if (found.length) {
    const samples = [...new Set(found.map((f) => f[0].trim()))].slice(0, 5).join(", ");
    hits.push({ ...r, count: found.length, samples });
  }
}
for (const d of DESIGN) hits.push({ ...d, count: 1, samples: "" });

const icon = { FAIL: "❌", WARN: "⚠️ " };
console.log(`\n리포트 린트: ${path}`);
console.log("─".repeat(72));
if (!hits.length) console.log("깨끗함 · 걸린 룰 없음");
for (const h of hits) console.log(`${icon[h.level]} [${h.id}] ${h.msg}${h.samples ? `  ← ${h.count}건: ${h.samples}` : ""}`);
const fails = hits.filter((h) => h.level === "FAIL").length;
const warns = hits.filter((h) => h.level === "WARN").length;
console.log("─".repeat(72));
console.log(`${fails ? "❌ 발행 불가" : "✅ 통과"} — FAIL ${fails} · WARN ${warns}\n`);
process.exit(fails ? 1 : 0);
