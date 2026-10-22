// components/whoop/WhoopStatusIcon.jsx — WHOOP 연결 상태 아이콘 (시계 + 상태 점). 마우스 올리면 글자 표시(title).
// 연결됨=초록 점 / 재연결 필요=노란 느낌표 / 그 외(미연결·해제)=표시 없음(fallback이면 회색 시계). WHOOP 로고는 쓰지 않음(브랜드 규칙).
import { Watch } from "lucide-react";

const STATE = {
  active: { label: "WHOOP 연결됨", icon: "text-[#1f8a4c]", badge: "bg-[#1f8a4c]", mark: "" },
  needs_reauth: { label: "WHOOP 재연결 필요", icon: "text-[#b7791f]", badge: "bg-[#f2b705]", mark: "!" },
};

export default function WhoopStatusIcon({ status, size = 16, fallback = false }) {
  const s = STATE[status];
  if (!s) return fallback ? <Watch className="flex-none text-muted-foreground" style={{ width: size, height: size }} strokeWidth={2} aria-label="WHOOP 연결 안 됨" /> : null;
  return (
    <span title={s.label} aria-label={s.label} className="relative inline-flex flex-none">
      <Watch className={s.icon} style={{ width: size, height: size }} strokeWidth={2.2} />
      <span className={`absolute -right-1 -bottom-1 min-w-[10px] h-[10px] rounded-full ring-2 ring-white ${s.badge} text-[8px] leading-[10px] font-extrabold text-white text-center`}>{s.mark}</span>
    </span>
  );
}
