// lib/whoop/format.js — WHOOP 화면 표시용 포맷 (서버·클라이언트 공용)
export function fmtDur(ms) {
  if (ms == null) return "미정";
  const m = Math.round(ms / 60000);
  return `${Math.floor(m / 60)}시간 ${m % 60}분`;
}
