"use client";
// 코치 세션 작업공간 — [가이드(세션 전 준비) | 노트(세션 후 기록)] 탭. 공통 헤더 제공.
import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, Eye } from "lucide-react";
import { cn } from "../../lib/utils";
import SessionGuideForm from "./SessionGuideForm";
import SessionNoteForm from "./SessionNoteForm";

export default function SessionWorkspace({ session, timeline, dateLabel }) {
  const [tab, setTab] = useState("guide"); // guide | note
  const title = `${session.n || 1}회차`;

  // 가이드 탭 = PC 풀와이드(좌우 여백 최소), 노트 탭 = 폼 폭 유지(520)
  const wrap = tab === "guide" ? "w-full max-w-[1600px]" : "w-full max-w-[520px]";

  return (
    <div className="min-h-[100dvh] bg-background pb-[calc(84px+env(safe-area-inset-bottom))]">
      <div className={cn("mx-auto", wrap)}>
        {/* 헤더 */}
        <div className="px-4 lg:px-6 pt-[calc(env(safe-area-inset-top)+14px)] pb-2 flex items-center gap-3 border-b border-border">
          <Link href="/portal" className="w-9 h-9 -ml-1.5 rounded-lg flex items-center justify-center active:bg-muted"><ChevronLeft className="w-6 h-6" /></Link>
          <div className="min-w-0 flex-1">
            <h1 className="text-[18px] font-bold tracking-[-0.3px] leading-tight">{title} · {tab === "guide" ? "세션 가이드" : "코칭 노트"}</h1>
            {dateLabel ? <div className="text-[13px] text-muted-foreground">{dateLabel}</div> : null}
          </div>
          <Link href={`/session/${session.id}`} target="_blank" className="flex items-center gap-1.5 text-[13px] font-semibold text-primary px-2.5 py-1.5 rounded-lg bg-primary/10"><Eye className="w-4 h-4" />선수 화면</Link>
        </div>

        {/* 상위 탭 */}
        <div className="px-4 lg:px-6 pt-4">
          <div className="flex bg-background border border-border rounded-xl p-[3px] max-w-[420px]">
            <button type="button" onClick={() => setTab("guide")} className={cn("flex-1 py-2.5 rounded-[9px] text-[13.5px] font-bold", tab === "guide" ? "bg-navy text-white shadow-sm" : "text-muted-foreground")}>가이드 · 세션 전</button>
            <button type="button" onClick={() => setTab("note")} className={cn("flex-1 py-2.5 rounded-[9px] text-[13.5px] font-bold", tab === "note" ? "bg-navy text-white shadow-sm" : "text-muted-foreground")}>노트 · 세션 후</button>
          </div>
        </div>

        {tab === "guide"
          ? <div className="px-4 lg:px-6 py-5"><SessionGuideForm session={session} timeline={timeline} /></div>
          : <SessionNoteForm session={session} />}
      </div>
    </div>
  );
}
