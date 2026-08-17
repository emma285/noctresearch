// 코치 대시보드 (데스크탑 콘솔). CoachShell 안에서 KPI + 선수 테이블 + 우측 '오늘 할 일'.
import Link from "next/link";
import { Search, ChevronRight, Sparkles, AlertCircle, CalendarDays } from "lucide-react";
import CoachShell from "./CoachShell";
import AthleteRow from "./AthleteRow";

const DOW = ["일", "월", "화", "수", "목", "금", "토"];
function whenLabel(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(iso || "");
  if (!m) return "일정 미정";
  const dow = DOW[new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])).getUTCDay()];
  return `${+m[2]}.${m[3]} (${dow}) ${m[4]}:${m[5]}`;
}
function dday(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || ""); if (!m) return "";
  const t = Date.UTC(+m[1], +m[2] - 1, +m[3]); const n = new Date();
  const today = Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate());
  const d = Math.round((t - today) / 86400000);
  return d > 0 ? `D-${d}` : d === 0 ? "D-day" : "";
}

function Kpi({ v, k, accent }) {
  return (
    <div className="bg-white border border-[#e6e7eb] rounded-xl px-[18px] py-4">
      <div className={`text-[26px] font-extrabold tracking-[-0.5px] ${accent ? "text-primary" : "text-[#1b2a3f]"}`}>{v}</div>
      <div className="text-[12px] text-[#8a90a0] mt-1.5">{k}</div>
    </div>
  );
}

export default function CoachDashboard({ coachName = "코치", athletes = [], overview = {} }) {
  const total = athletes.length;
  const ongoingCount = athletes.filter((a) => a.ongoing).length;
  const intakeDoneCount = athletes.filter((a) => a.intakeDone).length;
  const { upcoming = [], pending = [], weekCount = 0, pendingCount = 0 } = overview;

  return (
    <CoachShell active="dashboard" coachName={coachName}>
      <div className="px-5 lg:px-7 py-6 max-w-[1440px]">
        {/* 상단 */}
        <div className="flex items-center justify-between gap-4 mb-5">
          <h1 className="text-[21px] font-extrabold text-[#1b2a3f]">대시보드</h1>
          <div className="flex items-center gap-2.5">
            <div className="hidden sm:flex items-center gap-2 w-[220px] h-9 border border-[#d9dce1] rounded-lg bg-white px-3 text-[12.5px] text-[#b6bbc4]"><Search className="w-3.5 h-3.5" />선수 검색…</div>
          </div>
        </div>

        {/* KPI */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-5">
          <Kpi v={total} k="담당 선수" />
          <Kpi v={ongoingCount} k="진행중" accent />
          <Kpi v={weekCount} k="이번 주 세션" />
          <Kpi v={pendingCount} k="AI 노트 검토 대기" />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-[18px] items-start">
          {/* 선수 테이블 */}
          <div className="bg-white border border-[#e6e7eb] rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-[#e7e9ed]">
              <h2 className="text-[13.5px] font-extrabold text-[#2a3340]">담당 선수</h2>
              <span className="text-[12px] text-[#9298a2] font-semibold">진행중 먼저</span>
            </div>
            {total === 0 ? (
              <div className="py-14 text-center text-[13px] text-[#9aa0ab]">아직 담당 선수가 없어요.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse min-w-[640px]">
                  <thead>
                    <tr className="text-[11px] font-bold text-[#9aa0ab] uppercase tracking-[0.5px]">
                      <th className="text-left px-4 py-2.5 border-b border-[#e7e9ed] font-bold">선수</th>
                      <th className="text-left px-4 py-2.5 border-b border-[#e7e9ed] font-bold">상태</th>
                      <th className="text-left px-4 py-2.5 border-b border-[#e7e9ed] font-bold">다음 세션</th>
                      <th className="text-left px-4 py-2.5 border-b border-[#e7e9ed] font-bold">프로그램</th>
                      <th className="text-right px-4 py-2.5 border-b border-[#e7e9ed] font-bold">액션</th>
                    </tr>
                  </thead>
                  <tbody>
                    {athletes.map((a) => <AthleteRow key={a.uid} a={a} />)}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* 우측 오늘 할 일 */}
          <div className="flex flex-col gap-[18px]">
            <div className="bg-white border border-[#e6e7eb] rounded-xl overflow-hidden">
              <div className="px-4 py-3.5 border-b border-[#e7e9ed]"><h2 className="text-[13.5px] font-extrabold text-[#2a3340]">이번 주 세션</h2></div>
              {upcoming.length === 0 ? <div className="px-4 py-8 text-center text-[12.5px] text-[#9aa0ab]">예정된 세션이 없어요.</div>
                : upcoming.map((s, i) => (
                  <Link key={i} href={s.id ? `/coach/session/${s.id}` : `/coach/clients/${s.pageId}`} className="flex items-center gap-3 px-4 py-3.5 border-b border-[#e7e9ed] last:border-b-0 hover:bg-[#fafbfc]">
                    <span className="w-9 h-9 rounded-lg bg-[#eef0fb] text-primary flex items-center justify-center flex-none"><CalendarDays className="w-[18px] h-[18px]" /></span>
                    <div className="flex-1 min-w-0"><div className="text-[13.5px] font-bold text-[#1b2a3f] truncate">{s.name}</div><div className="text-[12px] text-[#9298a2] mt-0.5">{whenLabel(s.at)}{dday(s.at) ? ` · ${dday(s.at)}` : ""}</div></div>
                    <ChevronRight className="w-4 h-4 text-[#c2c7cf] flex-none" />
                  </Link>
                ))}
            </div>
            <div className="bg-white border border-[#e6e7eb] rounded-xl overflow-hidden">
              <div className="px-4 py-3.5 border-b border-[#e7e9ed] flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5 text-primary" /><h2 className="text-[13.5px] font-extrabold text-[#2a3340]">AI 노트 검토 대기</h2></div>
              {pending.length === 0 ? <div className="px-4 py-8 text-center text-[12.5px] text-[#9aa0ab]">검토할 노트가 없어요.</div>
                : pending.map((s) => (
                  <Link key={s.id} href={`/coach/session/${s.id}`} className="flex items-center gap-3 px-4 py-3.5 border-b border-[#e7e9ed] last:border-b-0 hover:bg-[#fafbfc]">
                    <span className="w-9 h-9 rounded-lg bg-[#fdecee] text-[#EC4A54] flex items-center justify-center flex-none"><AlertCircle className="w-[18px] h-[18px]" /></span>
                    <div className="flex-1 min-w-0"><div className="text-[13.5px] font-bold text-[#1b2a3f] truncate">{s.name} · {s.n}회차 노트</div><div className="text-[12px] text-[#9298a2] mt-0.5">AI 초안 완료 · 검토 후 공개</div></div>
                    <ChevronRight className="w-4 h-4 text-[#c2c7cf] flex-none" />
                  </Link>
                ))}
            </div>
          </div>
        </div>
      </div>
    </CoachShell>
  );
}
