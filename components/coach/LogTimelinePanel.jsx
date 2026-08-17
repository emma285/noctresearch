"use client";
// 수면·루틴 로그 — 컴팩트 미리보기(좌우 스크롤) + [전체화면] 팝업.
// 프로토콜(목표) 있으면 "프로토콜 비교" 토글 노출 → 목표(점선) 오버레이 + 순응도 요약.
import { useState } from "react";
import { Maximize2, X, Target } from "lucide-react";
import LogTimeline from "../app/LogTimeline";

// 서명된 분 → "1h12m 일찍/늦게". 0=정시.
function fmtDelta(m) {
  if (m == null) return { s: "-", c: "#9aa0ab" };
  const a = Math.abs(m), h = Math.floor(a / 60), mm = a % 60;
  if (m === 0) return { s: "정시", c: "#1f8a4c" };
  const body = (h ? h + "h" : "") + (mm ? (h ? " " : "") + mm + "m" : "");
  return { s: (m < 0 ? "−" : "+") + (body || "0m"), c: m < 0 ? "#c0554a" : "#2a7fa5" };
}

export default function LogTimelinePanel({ cols = [], sleeps = [], routines = [], targets = [], summary = null, compactHeight = 300 }) {
  const [open, setOpen] = useState(false);
  const hasTargets = targets.length > 0;
  const [cmp, setCmp] = useState(true); // 프로토콜 비교 (목표 있으면 기본 ON)
  const has = (sleeps?.length || 0) + (routines?.length || 0) > 0;

  if (!has) return <div className="rounded-xl border border-border bg-muted/30 py-10 text-center text-[13px] text-muted-foreground">최근 수면·루틴 기록이 없어요.</div>;

  const wA = fmtDelta(summary?.wakeAvg), bA = fmtDelta(summary?.bedAvg);
  const grid = () => <LogTimeline cols={cols} sleeps={sleeps} routines={routines} targets={targets} showTargets={cmp && hasTargets} />;

  return (
    <div>
      {hasTargets && (
        <div className="flex items-center justify-between gap-3 mb-2.5 flex-wrap">
          <button type="button" onClick={() => setCmp((v) => !v)}
            className={`inline-flex items-center gap-2 text-[12px] font-extrabold rounded-full pl-3 pr-1.5 py-1.5 border transition-colors ${cmp ? "text-[#5A4FA6] bg-[#8E9BE8]/[0.12] border-[#d8ddf5]" : "text-[#8a90a0] bg-white border-[#e6e7eb]"}`}>
            <Target className="w-3.5 h-3.5" />프로토콜 비교
            <span className={`relative w-8 h-[18px] rounded-full transition-colors ${cmp ? "bg-[#4355B0]" : "bg-[#cfd3dc]"}`}>
              <span className={`absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white transition-all ${cmp ? "left-[15px]" : "left-0.5"}`} />
            </span>
          </button>
          {cmp && summary && (
            <div className="flex items-center gap-3 text-[12px]">
              <span className="text-[#9298a2] font-semibold">목표 대비 {summary.days}일</span>
              <span className="font-bold">기상 <b style={{ color: wA.c }}>{wA.s}</b></span>
              <span className="font-bold">취침 <b style={{ color: bA.c }}>{bA.s}</b></span>
            </div>
          )}
        </div>
      )}

      <div className="relative">
        <div style={{ maxHeight: compactHeight, overflow: "auto" }} className="rounded-xl">
          {grid()}
        </div>
        <button type="button" onClick={() => setOpen(true)}
          className="absolute top-2 right-2 z-10 inline-flex items-center gap-1.5 text-[11.5px] font-bold text-primary bg-white border border-[#dbe0f4] rounded-lg px-2.5 py-1.5 shadow-sm active:opacity-90">
          <Maximize2 className="w-3.5 h-3.5" />전체화면
        </button>
      </div>
      <p className="text-[11.5px] text-muted-foreground mt-2">좌우로 스크롤해 날짜 이동 · 전체화면으로 크게 보기{hasTargets ? " · 점선=프로토콜 목표" : ""}</p>

      {open ? (
        <div className="fixed inset-0 z-50 bg-[#141e30]/60 flex items-center justify-center p-4 md:p-8" onClick={() => setOpen(false)}>
          <div className="w-full max-w-[1120px] bg-white rounded-2xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h4 className="text-[15px] font-extrabold text-[#1b2a3f]">수면·루틴 로그{cmp && hasTargets ? " · 프로토콜 비교" : ""}</h4>
              <button type="button" onClick={() => setOpen(false)} className="w-8 h-8 rounded-lg bg-muted text-muted-foreground flex items-center justify-center active:bg-muted/70"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-4 md:p-5" style={{ maxHeight: "80vh", overflow: "auto" }}>
              {grid()}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
