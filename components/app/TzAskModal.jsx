"use client";
// 타임존이 바뀐 게 감지될 때(여행 직후) 딱 한 번 뜨는 확인 팝업.
// 앱 모달 패턴(RoutineLog 시트) 동일 — 오버레이 + bg-card 라운드 + 옵션 리스트.
import { Clock } from "lucide-react";
import { tzRegionLabel } from "../../lib/tz";

function Opt({ tz, tag, onPick }) {
  return (
    <button type="button" onClick={() => onPick(tz)}
      className="w-full flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3.5 text-left active:bg-muted/40 transition-colors">
      <span>
        <span className="block text-[12px] font-semibold text-muted-foreground">{tag}</span>
        <span className="text-[15px] font-bold text-navy">{tzRegionLabel(tz)}</span>
      </span>
    </button>
  );
}

export default function TzAskModal({ open, prevTz, curTz, onPick, onClose }) {
  if (!open || !prevTz || !curTz) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-5">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-[350px] bg-card rounded-2xl p-5 shadow-[0_24px_64px_rgba(13,27,42,.28)]">
        <div className="flex items-center gap-2.5 mb-2">
          <span className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center"><Clock className="w-5 h-5" strokeWidth={2.2} /></span>
          <span className="text-[17px] font-bold text-navy">타임존이 바뀌었어요</span>
        </div>
        <p className="text-[14px] text-navy font-semibold leading-relaxed mb-0.5">이 기록은 어느 곳 기준인가요?</p>
        <p className="text-[12.5px] text-muted-foreground leading-relaxed mb-4">(비행 중 기록의 경우, 출발 지역 선택)</p>
        <div className="space-y-2.5">
          <Opt tz={prevTz} tag="이전 지역" onPick={onPick} />
          <Opt tz={curTz} tag="현재 지역" onPick={onPick} />
        </div>
      </div>
    </div>
  );
}
