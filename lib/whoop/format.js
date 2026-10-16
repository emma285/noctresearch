// lib/whoop/format.js — WHOOP 화면 표시용 포맷 (서버·클라이언트 공용)

// 값 없음 상태 → 표시 문구 (상태 정의는 lib/whoop/days.js)
export const STATE_LABEL = { none: "기록 없음", pending: "계산 중", unscorable: "계산 불가" };

export function fmtDur(ms) {
  if (ms == null) return "-";
  const m = Math.round(ms / 60000);
  return `${Math.floor(m / 60)}시간 ${m % 60}분`;
}
