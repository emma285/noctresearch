// app/coach/schedule/page.js — 코치 일정(다가오는 세션 아젠다). 캘린더 이벤트 연동은 다음 단계.
import { currentUser } from "@clerk/nextjs/server";
import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { isCoachEmail } from "../../../lib/coach";
import { getAllSessionsForCoach } from "../../../lib/master";
import CoachShell from "../../../components/coach/CoachShell";

export const metadata = { title: "일정 | NOCT" };
export const dynamic = "force-dynamic";
const DOW = ["일", "월", "화", "수", "목", "금", "토"];
function parse(iso) { const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(iso || ""); return m ? { y: +m[1], mo: +m[2], d: +m[3], h: m[4], mi: m[5] } : null; }
function dayLabel(p) { return `${p.mo}월 ${p.d}일 (${DOW[new Date(Date.UTC(p.y, p.mo - 1, p.d)).getUTCDay()]})`; }

export default async function CoachSchedulePage() {
  const user = await currentUser();
  if (!isCoachEmail(user?.emailAddresses?.[0]?.emailAddress)) return <div className="p-10 text-center text-sm text-muted-foreground">코치 전용 페이지예요.</div>;
  const coachName = user?.unsafeMetadata?.name || user?.firstName || "코치";
  const now = Date.now();
  const upcoming = (await getAllSessionsForCoach())
    .filter((s) => s.date && new Date(s.date).getTime() >= now - 12 * 3600000)
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  // 날짜별 그룹
  const groups = [];
  for (const s of upcoming) {
    const p = parse(s.date); if (!p) continue;
    const key = `${p.y}-${p.mo}-${p.d}`;
    let g = groups.find((x) => x.key === key);
    if (!g) { g = { key, p, items: [] }; groups.push(g); }
    g.items.push({ ...s, p });
  }

  return (
    <CoachShell active="schedule" coachName={coachName}>
      <div className="px-5 lg:px-7 py-6 max-w-[900px]">
        <h1 className="text-[21px] font-extrabold text-[#1b2a3f] mb-1.5">일정</h1>
        <p className="text-[13px] text-[#9298a2] mb-5">다가오는 코칭 세션 · 경기·이동 등 캘린더 연동은 다음 단계</p>
        {groups.length === 0 ? (
          <div className="bg-white border border-[#e6e7eb] rounded-xl py-14 text-center text-[13px] text-[#9aa0ab]">예정된 세션이 없어요.</div>
        ) : groups.map((g) => (
          <div key={g.key} className="mb-5">
            <div className="flex items-center gap-2 mb-2 text-[13px] font-extrabold text-[#3a3f48]"><CalendarDays className="w-4 h-4 text-primary" />{dayLabel(g.p)}</div>
            <div className="bg-white border border-[#e6e7eb] rounded-xl overflow-hidden">
              {g.items.map((s) => (
                <Link key={s.id} href={`/coach/session/${s.id}`} className="flex items-center gap-3 px-4 py-3.5 border-t border-[#e7e9ed] first:border-t-0 hover:bg-[#fafbfc]">
                  <span className="w-14 text-[13px] font-bold text-[#1b2a3f] flex-none">{(s.p.h === "00" && s.p.mi === "00") ? "시간미정" : `${s.p.h}:${s.p.mi}`}</span>
                  <div className="flex-1 min-w-0"><div className="text-[14px] font-bold text-[#1b2a3f]">{s.name} · {s.n}회차 세션</div></div>
                  <span className="text-[12px] font-bold text-primary">가이드 →</span>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </CoachShell>
  );
}
