// app/coach/reports/page.js — 코치 리포트 관리(전체 선수). 리포트별 공개 토글.
import { currentUser } from "@clerk/nextjs/server";
import { isCoachEmail, COACH_EMAILS } from "../../../lib/coach";
import { getAllAthletes } from "../../../lib/master";
import { resolveAssets } from "../../../lib/athleteAssets";
import CoachShell from "../../../components/coach/CoachShell";
import ReportPublishToggle from "../../../components/coach/ReportPublishToggle";

export const metadata = { title: "리포트 | NOCT" };
export const dynamic = "force-dynamic";

export default async function CoachReportsPage() {
  const user = await currentUser();
  if (!isCoachEmail(user?.emailAddresses?.[0]?.emailAddress)) return <div className="p-10 text-center text-sm text-muted-foreground">코치 전용 페이지예요.</div>;
  const coachName = user?.unsafeMetadata?.name || user?.firstName || "코치";
  const athletes = (await getAllAthletes()).filter((a) => a.email && !COACH_EMAILS.includes(String(a.email).toLowerCase()));
  const withReports = athletes.map((a) => ({ a, reports: resolveAssets(a).reports, pub: new Set((a.publishedReports || []).map(String)) })).filter((x) => x.reports.length > 0);

  return (
    <CoachShell active="reports" coachName={coachName}>
      <div className="px-5 lg:px-7 py-6 max-w-[1000px]">
        <h1 className="text-[21px] font-extrabold text-[#1b2a3f] mb-1.5">리포트</h1>
        <p className="text-[13px] text-[#9298a2] mb-5">토글을 켜면 해당 선수 홈에 리포트 카드가 열려요.</p>
        {withReports.length === 0 ? (
          <div className="bg-white border border-[#e6e7eb] rounded-xl py-12 text-center text-[13px] text-[#9aa0ab]">아직 등록된 리포트가 없어요.</div>
        ) : withReports.map(({ a, reports, pub }) => (
          <div key={a.pageId} className="bg-white border border-[#e6e7eb] rounded-xl overflow-hidden mb-[18px]">
            <div className="px-4 py-3.5 border-b border-[#e7e9ed] flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-full bg-[#e4e7ec] flex items-center justify-center text-[11px] font-bold text-[#6b7280]">{(a.name || "선")[0]}</span>
              <h2 className="text-[13.5px] font-extrabold text-[#2a3340]">{a.name}<span className="text-[12px] font-semibold text-[#9298a2] ml-1.5">{a.sport || "선수"}</span></h2>
            </div>
            {reports.map((r) => (
              <div key={r.slug} className="flex items-center gap-3 px-4 py-3.5 border-t border-[#e7e9ed] first:border-t-0">
                <div className="flex-1 min-w-0"><div className="text-[14px] font-semibold text-[#1b2a3f] truncate">{r.label}</div>{(r.badge || r.date) ? <div className="text-[12px] text-[#9298a2] mt-0.5">{[r.badge, r.date].filter(Boolean).join(" · ")}</div> : null}</div>
                <ReportPublishToggle email={a.email} uid={a.clerkUserId} slug={r.slug} initialOn={pub.has(r.slug)} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </CoachShell>
  );
}
