// lib/tz.js — 타임존 인식 헬퍼 (클라이언트/서버 공용, Intl 기반, 외부 의존성 없음).
// 원칙: 로그는 "그 사람이 있던 곳의 벽시계 + tz(IANA)" 그대로 저장. 표시는 벽시계 그대로 + tz 배지.
// 기존 데이터(tz 없음)는 홈(Asia/Seoul)으로 간주.

export const HOME_TZ = "Asia/Seoul";

// 기기(브라우저) 타임존. 서버/실패 시 HOME_TZ.
export function deviceTz() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || HOME_TZ;
  } catch {
    return HOME_TZ;
  }
}

// 특정 tz의 YYYY-MM-DD (그 tz 벽시계 날짜). ts 없으면 지금.
export function todayIn(tz = deviceTz(), ts = Date.now()) {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(ts));
  } catch {
    return new Date(ts).toISOString().slice(0, 10);
  }
}

export function yesterdayIn(tz = deviceTz()) {
  return todayIn(tz, Date.now() - 86400000);
}

// 특정 tz의 현재 분(자정 기준). round=15면 15분 반올림.
export function nowMinIn(tz = deviceTz(), round = 0) {
  try {
    const s = new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date());
    const [h, m] = s.split(":").map(Number);
    let min = (h % 24) * 60 + m;
    if (round) min = Math.round(min / round) * round;
    return min;
  } catch {
    return 0;
  }
}

// tz의 UTC 오프셋(분). 예: Asia/Seoul=+540, America/New_York(EDT)=-240.
export function tzOffsetMin(tz, ts = Date.now()) {
  try {
    const dtf = new Intl.DateTimeFormat("en-US", { timeZone: tz, hour12: false, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" });
    const p = Object.fromEntries(dtf.formatToParts(new Date(ts)).map((x) => [x.type, x.value]));
    let hour = +p.hour % 24;
    const asUTC = Date.UTC(+p.year, +p.month - 1, +p.day, hour, +p.minute, +p.second);
    return Math.round((asUTC - ts) / 60000);
  } catch {
    return 0;
  }
}

// tz 약어(EDT/KST 등). 실패 시 "".
export function tzAbbr(tz, ts = Date.now()) {
  try {
    const parts = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "short" }).formatToParts(new Date(ts));
    return parts.find((p) => p.type === "timeZoneName")?.value || "";
  } catch {
    return "";
  }
}

// "America/New_York" → "New York" (표시용).
export function cityOf(tz) {
  const seg = String(tz || "").split("/").pop() || tz || "";
  return seg.replace(/_/g, " ");
}

// IANA tz → 친근한 지역 라벨(한글). GPS 아님, 시간대 기준이라 "대표 지역".
const REGION = {
  "Asia/Seoul": "한국 (서울)",
  "America/New_York": "미국 동부 (뉴욕·보스턴)",
  "America/Chicago": "미국 중부 (시카고)",
  "America/Denver": "미국 산악 (덴버)",
  "America/Los_Angeles": "미국 서부 (LA)",
  "America/Phoenix": "미국 애리조나",
  "Europe/London": "영국 (런던)",
  "Europe/Paris": "유럽 중부 (파리)",
  "Europe/Berlin": "유럽 중부 (베를린)",
  "Asia/Tokyo": "일본 (도쿄)",
  "Asia/Shanghai": "중국 (상하이)",
  "Asia/Hong_Kong": "홍콩",
  "Asia/Singapore": "싱가포르",
  "Asia/Bangkok": "태국 (방콕)",
  "Asia/Dubai": "UAE (두바이)",
  "Australia/Sydney": "호주 동부 (시드니)",
};
export function tzRegionLabel(tz) {
  if (!tz) return "";
  return REGION[tz] || cityOf(tz);
}

// (dateStr 'YYYY-MM-DD', min 자정기준분) 을 tz의 벽시계로 보고 → 그 순간의 UTC ms.
export function wallToUtcMs(dateStr, min, tz) {
  try {
    const [y, mo, d] = String(dateStr).split("-").map(Number);
    const h = Math.floor(min / 60), mm = ((min % 60) + 60) % 60;
    const guess = Date.UTC(y, mo - 1, d, h, mm); // 일단 UTC로 가정
    const off = tzOffsetMin(tz, guess);          // 그 근처 tz 오프셋(분)
    return guess - off * 60000;
  } catch {
    return null;
  }
}

// UTC ms → tz의 { date:'YYYY-MM-DD', min:자정기준분 }
export function wallInTz(ms, tz) {
  try {
    const date = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(ms);
    const t = new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false }).format(ms);
    const [h, m] = t.split(":").map(Number);
    return { date, min: (h % 24) * 60 + m };
  } catch {
    return null;
  }
}

// (dateStr, min, fromTz) 벽시계 → 홈(KST) 벽시계 { date, min }. fromTz 없거나 홈이면 그대로.
export function localToHome(dateStr, min, fromTz, homeTz = HOME_TZ) {
  if (!fromTz || fromTz === homeTz || typeof min !== "number") return { date: dateStr, min };
  const ms = wallToUtcMs(dateStr, min, fromTz);
  if (ms == null) return { date: dateStr, min };
  return wallInTz(ms, homeTz) || { date: dateStr, min };
}

// 홈(KST)과 다르면 배지 문자열, 같거나 없으면 "" (배지 안 띄움).
// 예: "New York EDT · KST−13h"
export function tzBadgeLabel(tz, refTz = HOME_TZ) {
  if (!tz || tz === refTz) return "";
  const diffH = Math.round((tzOffsetMin(tz) - tzOffsetMin(refTz)) / 60);
  const rel = diffH === 0 ? "" : ` · KST${diffH > 0 ? "+" : "−"}${Math.abs(diffH)}h`;
  return `${tzRegionLabel(tz)}${rel}`;
}
