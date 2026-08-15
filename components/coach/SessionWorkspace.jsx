"use client";
// 코치 세션 작업공간(데스크탑) — [가이드(세션 전) | 노트(세션 후)] 탭. CoachShell 안에서 렌더(page가 shell 제공).
import { useState } from "react";
import Link from "next/link";
import { Eye } from "lucide-react";
import { cn } from "../../lib/utils";
import SessionGuideForm from "./SessionGuideForm";
import SessionNoteForm from "./SessionNoteForm";

export default function SessionWorkspace({ session, timeline, dateLabel, clientName = "선수", clientEmail = "", initialTab = "guide" }) {
  const [tab, setTab] = useState(initialTab === "note" ? "note" : "guide");
  const n = session.n || 1;

  return (
    <div className="px-5 lg:px-7 py-6 max-w-[1440px]">
      {/* 헤더 */}
      <div className="flex items-start justify-between gap-4 mb-5">
        <div className="min-w-0">
          <div className="text-[12.5px] text-[#9298a2] mb-1">
            <Link href="/portal" className="hover:text-primary">대시보드</Link> › {clientEmail ? <Link href={`/coach/clients/${encodeURIComponent(clientEmail)}`} className="hover:text-primary">{clientName}</Link> : clientName} › {n}회차
          </div>
          <div className="flex items-center gap-3.5 flex-wrap">
            <h1 className="text-[22px] font-extrabold text-[#1b2a3f] tracking-[-0.3px]">{clientName} · {n}회차</h1>
            <div className="inline-flex bg-[#eceef2] rounded-[10px] p-[3px] gap-0.5">
              <button type="button" onClick={() => setTab("guide")} className={cn("text-[13px] font-bold px-4 py-2 rounded-lg", tab === "guide" ? "bg-white text-primary shadow-sm" : "text-[#8a90a0]")}>가이드 · 세션 전</button>
              <button type="button" onClick={() => setTab("note")} className={cn("text-[13px] font-bold px-4 py-2 rounded-lg", tab === "note" ? "bg-white text-primary shadow-sm" : "text-[#8a90a0]")}>노트 · 세션 후</button>
            </div>
          </div>
          {dateLabel ? <div className="text-[13px] text-[#9298a2] mt-1.5">{dateLabel}</div> : null}
        </div>
        <div className="flex items-center gap-2 flex-none">
          <Link href={`/session/${session.id}`} target="_blank" className="inline-flex items-center gap-1.5 text-[12.5px] font-bold text-primary bg-primary/10 rounded-lg px-3 py-2"><Eye className="w-4 h-4" />선수 화면</Link>
        </div>
      </div>

      {tab === "guide"
        ? <SessionGuideForm session={session} timeline={timeline} />
        : <div className="bg-white border border-[#e6e7eb] rounded-xl overflow-hidden max-w-[720px]"><SessionNoteForm session={session} /></div>}
    </div>
  );
}
