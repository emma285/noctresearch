// lib/protocolExtract.js — 부가자료(타임테이블 HTML)에서 "프로토콜 비교 목표"(취침/기상)를 자동 추출.
// 우선순위: (1) <script id="protocol-targets"> 명시 블록 → (2) 없으면 타임테이블 DAYS 배열을 직접 읽어 자동 추출.
// 자동 추출 규칙(지어내지 않음): 실제 '수면' 카드 시각만 사용. 축에서 잘린 저녁 수면(다음날 새벽으로 이어짐)을
//   다음 날 첫 수면 카드와 이어붙여 bed/wake 산출. date=기상일 기준(로그와 정렬, targets.js).
//   미정(dashed) 블록·수면 아닌 블록은 목표에서 제외. 못 읽으면 그냥 [] (빈 값, 임의 채우기 금지).

const DOW = ["일", "월", "화", "수", "목", "금", "토"];

// dow 문자열('수 8/26' 등)에서 월/일 파싱 → {mo, dy} 또는 null
function parseMD(dow) {
  const m = /(\d{1,2})\s*\/\s*(\d{1,2})/.exec(String(dow || ""));
  return m ? { mo: +m[1], dy: +m[2] } : null;
}

// 연도 추정: 명시값 우선, 없으면 nowISO(YYYY-MM-DD) 기준 가장 가까운 연도(±1)에서 고름.
function pickYear(md, year, nowISO) {
  if (year) return year;
  const now = /^(\d{4})-(\d{2})-(\d{2})/.exec(nowISO || "");
  const y = now ? +now[1] : 2026;
  if (!now) return y;
  const nowT = Date.UTC(+now[1], +now[2] - 1, +now[3]);
  let best = y, bestD = Infinity;
  for (const cand of [y - 1, y, y + 1]) {
    const t = Date.UTC(cand, md.mo - 1, md.dy);
    const d = Math.abs(t - nowT);
    if (d < bestD) { bestD = d; best = cand; }
  }
  return best;
}

const iso = (y, mo, dy) => `${y}-${String(mo).padStart(2, "0")}-${String(dy).padStart(2, "0")}`;
const hhmm = (t) => { const x = ((t % 24) + 24) % 24; let hh = Math.floor(x), mm = Math.round((x - hh) * 60); if (mm === 60) { hh = (hh + 1) % 24; mm = 0; } return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`; };

// DAYS 배열 리터럴(데이터 전용)을 안전 평가. 실패 시 null.
function evalDays(html) {
  const m = /const\s+DAYS\s*=\s*(\[[\s\S]*?\n\]);/m.exec(html);
  if (!m) return null;
  try {
    // 리터럴은 문자열/숫자/불리언/중첩 배열·객체만 — 함수 호출 없음. 신뢰된 리포지토리 파일.
    // eslint-disable-next-line no-new-func
    const days = Function(`"use strict"; return (${m[1]});`)();
    return Array.isArray(days) ? days : null;
  } catch { return null; }
}

function axisMax(html) {
  const m = /AX1\s*=\s*(\d+)/.exec(html);
  return m ? +m[1] : 27; // 03:00~다음날 03:00 기본
}
function axisMin(html) {
  const m = /AX0\s*=\s*(\d+)/.exec(html);
  return m ? +m[1] : 3;
}

// 카드에서 [start,end,type,,,dashed] 안전 추출
function cardOf(c) {
  if (!Array.isArray(c)) return null;
  const start = c[0], end = c[1], type = c[2], dashed = c[c.length - 1] === true;
  if (typeof start !== "number" || typeof end !== "number" || typeof type !== "string") return null;
  return { start, end, type, dashed };
}

// 타임테이블 DAYS → 목표 배열. date=기상일.
function autoFromDays(html, year, nowISO) {
  const days = evalDays(html);
  if (!days || !days.length) return [];
  const AX1 = axisMax(html), AX0 = axisMin(html);
  // 각 날의 절대 날짜
  const dated = days.map((d) => {
    // M/D는 자료마다 date 필드('8/19')나 dow 필드('수 8/26') 어느 쪽에 있어 둘 다 본다.
    const md = parseMD(`${d.date || ""} ${d.dow || ""}`);
    if (!md) return { ...d, _iso: null };
    return { ...d, _iso: iso(pickYear(md, year, nowISO), md.mo, md.dy), _md: md };
  });
  const targets = [];
  for (let i = 1; i < dated.length; i++) {
    const prev = dated[i - 1], cur = dated[i];
    if (!cur._iso) continue;
    const prevCards = (prev.cards || []).map(cardOf).filter(Boolean);
    const curCards = (cur.cards || []).map(cardOf).filter(Boolean);
    // 전날 저녁 수면(축 끝까지 이어져 다음날로 넘어가는 것) → bed
    const evening = prevCards.find((c) => c.type === "수면" && !c.dashed && c.end >= AX1 && c.start > 12);
    // 이날 첫 새벽 수면(축 시작에서 시작) → wake
    const morning = curCards.find((c) => c.type === "수면" && !c.dashed && c.start <= AX0 + 0.01);
    if (!evening || !morning) continue;
    const bed = hhmm(evening.start);
    const wake = hhmm(morning.end);
    const label = `${prev.date || ""} 밤 → ${cur.date || ""} 오전`.trim();
    targets.push({ date: cur._iso, bed, wake, label });
  }
  return targets;
}

// 메인: HTML → { name, targets, source }
export function extractProtocolTargets(html, opts = {}) {
  const { year, nowISO } = opts;
  const m = /<script id="protocol-targets"[^>]*>([\s\S]*?)<\/script>/i.exec(html || "");
  if (m) {
    try {
      const d = JSON.parse(m[1].trim());
      if (Array.isArray(d.targets) && d.targets.length) return { name: d.name || "", targets: d.targets, source: "explicit" };
    } catch { /* fall through */ }
  }
  const targets = autoFromDays(html || "", year, nowISO);
  return { name: "", targets, source: targets.length ? "auto" : "none" };
}

export { DOW };
