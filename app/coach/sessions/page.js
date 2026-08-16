// app/coach/sessions/page.js — 코치 세션 목록(전체 선수). 데스크탑 콘솔.
import { currentUser } from "@clerk/nextjs/server";
import Link from "next/link";
import { isCoachEmail } from "../../../lib/coach";
import { getAllSessionsForCoach } from "../../../lib/master";
import CoachShell from "../../../components/coach/CoachShell";

export const metadata = { title: "세션 | NOCT" };
export const dynamic = "force-dynamic";
const DOW = ["일", "월", "화", "수", "목", "금", "토"];
function fmt(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(iso || "");
  if (!m) return "날짜 미정";
  const dow = DOW[new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])).getUTCDay()];
  const hm = (m[4] === "00" && m[5] === "00") ? "" : ` ${m[4]}:${m[5]}`;
  return `${+m[2]}월 ${+m[3]}일 (${dow})${hm}`;
}
function statusOf(s) {
  if (s.published) return { t: "공개됨", c: "bg-[#e7f4ec] text-[#1f8a4c]" };
  if (s.hasNote) return { t: "노트 검토중", c: "bg-[#eef0fb] text-primary" };
  if (s.hasGuide) return { t: "가이드 준비됨", c: "bg-[#e8f5fb] text-[#2a7fa5]" };
  return { t: "준비 전", c: "bg-[#eef0f3] text-[#6b7280]" };
}

function Group({ title, items }) {
  return (
    <div className="bg-white border border-[#e6e7eb] rounded-xl overflow-hidden mb-[18px]">
      <div className="px-4 py-3.5 border-b border-[#e7e9ed] flex items-center justify-between">
        <h2 className="text-[13.5px] font-extrabold text-[#2a3340]">{title}</h2>
        <span className="text-[12px] text-[#9298a2] font-semibold">{items.length}건</span>
      </div>
      {items.length === 0 ? <div className="py-8 text-center text-[13px] text-[#9aa0ab]">없어요.</div>
        : items.map((s) => {
          const st = statusOf(s);
          const done = s.published || s.hasNote;
          return (
            <div key={s.id} className="flex items-center gap-3 px-4 py-3.5 border-t border-[#e7e9ed] first:border-t-0">
              <span className="w-9 h-9 rounded-lg bg-[#eef0fb] text-primary text-[12px] font-extrabold flex items-center justify-center flex-none">{s.n ?? "-"}회</span>
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-bold text-[#1b2a3f] flex items-center gap-2 flex-wrap">{s.name} · {s.n}회차<span className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full ${st.c}`}>{st.t}</span></div>
                <div className="text-[12.5px] text-[#9298a2] mt-0.5">{fmt(s.date)}</div>
              </div>
              {!done
                ? <Link href={`/coach/session/${s.id}`} className="text-[12px] font-bold px-2.5 py-1.5 rounded-lg bg-primary text-white whitespace-nowrap">가이드 작성</Link>
                : s.hasGuide
                  ? <Link href={`/coach/session/${s.id}`} className="text-[12px] font-bold px-2.5 py-1.5 rounded-lg border border-[#d9dce1] text-[#3a3f48] whitespace-nowrap">가이드 보기</Link>
                  : <span className="text-[12px] font-bold px-2.5 py-1.5 rounded-lg border border-[#eef0f3] text-[#c2c7cf] whitespace-nowrap cursor-not-allowed" title="세션 종료 · 가이드 작성 불가">가이드 작성</span>}
              <Link href={`/coach/session/${s.id}?tab=note`} className="text-[12px] font-bold px-2.5 py-1.5 rounded-lg border border-[#d9dce1] text-[#3a3f48] whitespace-nowrap">노트</Link>
            </div>
          );
        })}
    </div>
  );
}

export default async function CoachSessionsPage() {
  const user = await currentUser();
  if (!isCoachEmail(user?.emailAddresses?.[0]?.emailAddress)) return <div className="p-10 text-center text-sm text-muted-foreground">코치 전용 페이지예요.</div>;
  const coachName = user?.unsafeMetadata?.name || user?.firstName || "코치";
  const all = await getAllSessionsForCoach();
  const now = Date.now();
  const upcoming = all.filter((s) => s.date && new Date(s.date).getTime() >= now - 12 * 3600000).sort((a, b) => new Date(a.date) - new Date(b.date));
  const past = all.filter((s) => !s.date || new Date(s.date).getTime() < now - 12 * 3600000);

  return (
    <CoachShell active="sessions" coachName={coachName}>
      <div className="px-5 lg:px-7 py-6 max-w-[1000px]">
        <h1 className="text-[21px] font-extrabold text-[#1b2a3f] mb-5">세션</h1>
        <Group title="다가오는 세션" items={upcoming} />
        <Group title="지난 세션" items={past} />
      </div>
    </CoachShell>
  );
}
