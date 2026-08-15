"use client";
// 수면·루틴 로그 — 컴팩트 미리보기(좌우 스크롤) + [전체화면] 클릭 시 풀스크린 팝업.
import { useState } from "react";
import { Maximize2, X } from "lucide-react";
import LogTimeline from "../app/LogTimeline";

export default function LogTimelinePanel({ cols = [], sleeps = [], routines = [], compactHeight = 300 }) {
  const [open, setOpen] = useState(false);
  const has = (sleeps?.length || 0) + (routines?.length || 0) > 0;

  if (!has) return <div className="rounded-xl border border-border bg-muted/30 py-10 text-center text-[13px] text-muted-foreground">최근 수면·루틴 기록이 없어요.</div>;

  return (
    <div>
      <div className="relative">
        <div style={{ maxHeight: compactHeight, overflow: "auto" }} className="rounded-xl">
          <LogTimeline cols={cols} sleeps={sleeps} routines={routines} />
        </div>
        <button type="button" onClick={() => setOpen(true)}
          className="absolute top-2 right-2 z-10 inline-flex items-center gap-1.5 text-[11.5px] font-bold text-primary bg-white border border-[#dbe0f4] rounded-lg px-2.5 py-1.5 shadow-sm active:opacity-90">
          <Maximize2 className="w-3.5 h-3.5" />전체화면
        </button>
      </div>
      <p className="text-[11.5px] text-muted-foreground mt-2">좌우로 스크롤해 날짜 이동 · 전체화면으로 크게 보기</p>

      {open ? (
        <div className="fixed inset-0 z-50 bg-[#141e30]/60 flex items-center justify-center p-4 md:p-8" onClick={() => setOpen(false)}>
          <div className="w-full max-w-[1120px] bg-white rounded-2xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h4 className="text-[15px] font-extrabold text-[#1b2a3f]">수면·루틴 로그</h4>
              <button type="button" onClick={() => setOpen(false)} className="w-8 h-8 rounded-lg bg-muted text-muted-foreground flex items-center justify-center active:bg-muted/70"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-4 md:p-5" style={{ maxHeight: "80vh", overflow: "auto" }}>
              <LogTimeline cols={cols} sleeps={sleeps} routines={routines} />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
