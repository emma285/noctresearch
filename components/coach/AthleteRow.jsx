"use client";
// 대시보드 선수 테이블 행 — 행 전체 클릭 시 상세로. 액션 버튼은 각자 목적지(전파 차단).
import { useRouter } from "next/navigation";

export default function AthleteRow({ a }) {
  const router = useRouter();
  const detail = `/coach/clients/${encodeURIComponent(a.email)}`;
  const go = (e, href) => { e.stopPropagation(); router.push(href); };
  return (
    <tr onClick={() => router.push(detail)} className="hover:bg-[#fafbfc] cursor-pointer">
      <td className="px-4 py-3 border-b border-[#e7e9ed]">
        <div className="flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-full bg-[#e4e7ec] flex-none flex items-center justify-center text-[12px] font-bold text-[#6b7280]">{(a.name || "선")[0]}</span>
          <span className="min-w-0"><span className="block text-[13px] font-bold text-[#1b2a3f] truncate">{a.name}</span><span className="block text-[11.5px] text-[#9298a2]">{a.sport || "선수"}</span></span>
        </div>
      </td>
      <td className="px-4 py-3 border-b border-[#e7e9ed]">
        <span className={`inline-block text-[11px] font-bold px-2.5 py-1 rounded-full ${a.ongoing ? "bg-[#e7f4ec] text-[#1f8a4c]" : "bg-[#eef0f3] text-[#6b7280]"}`}>{a.ongoing ? (a.status || "진행중") : (a.intakeDone ? "설문 완료" : "설문 대기")}</span>
      </td>
      <td className="px-4 py-3 border-b border-[#e7e9ed] text-[13px] text-[#3a3f48]">{a.sessionLabel || "미배정"}</td>
      <td className="px-4 py-3 border-b border-[#e7e9ed] text-[13px] text-[#3a3f48]">{a.programLabel || "미정"}</td>
      <td className="px-4 py-3 border-b border-[#e7e9ed]">
        <div className="flex gap-1.5 justify-end">
          {a.latestSessionId ? <button type="button" onClick={(e) => go(e, `/coach/session/${a.latestSessionId}`)} className="text-[12px] font-bold px-2.5 py-1.5 rounded-lg bg-primary text-white whitespace-nowrap">세션 가이드</button> : null}
          <button type="button" onClick={(e) => go(e, detail)} className="text-[12px] font-bold px-2.5 py-1.5 rounded-lg border border-[#d9dce1] text-[#3a3f48] whitespace-nowrap">상세</button>
        </div>
      </td>
    </tr>
  );
}
