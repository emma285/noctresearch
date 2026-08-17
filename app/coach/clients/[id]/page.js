// app/coach/clients/[id]/page.js — 코치 콘솔 · 선수 상세 (데스크탑 2단). 코치 전용.
// [id] = 마스터 pageId(UUID). 이메일 대신 불투명 id로 라우팅(URL에 PII 노출 안 함).
import { currentUser } from "@clerk/nextjs/server";
import Link from "next/link";
import { ChevronRight, Eye, Sparkles } from "lucide-react";
import { isCoachEmail } from "../../../../lib/coach";
import { getAthleteByRef, getSessionsByAthlete } from "../../../../lib/master";
import { getAthleteEvents } from "../../../../lib/calendar";
import { getLogTimeline, kstToday } from "../../../../lib/log";
import { resolveAssets } from "../../../../lib/athleteAssets";
import CoachShell from "../../../../components/coach/CoachShell";
import CoachManageForm from "../../../../components/coach/CoachManageForm";
import CoachScheduleEditor from "../../../../components/coach/CoachScheduleEditor";
import ReportPublishToggle from "../../../../components/coach/ReportPublishToggle";
import LogTimelinePanel from "../../../../components/coach/LogTimelinePanel";

export const metadata = { title: "선수 상세 | NOCT" };
export const dynamic = "force-dynamic";
const DOW = ["일", "월", "화", "수", "목", "금", "토"];
const md = (iso) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || ""); return m ? `${+m[2]}월 ${+m[3]}일 (${DOW[new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])).getUTCDay()]})` : ""; };

function Panel({ title, right, children }) {
  return (
    <div className="bg-white border border-[#e6e7eb] rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-[#e7e9ed]">
        <h2 className="text-[13.5px] font-extrabold text-[#2a3340]">{title}</h2>
        {right || null}
      </div>
      {children}
    </div>
  );
}

export default async function CoachClientDetail({ params }) {
  const id = params.id;
  const user = await currentUser();
  if (!isCoachEmail(user?.emailAddresses?.[0]?.emailAddress)) {
    return <div className="p-10 text-center text-sm text-muted-foreground">코치 전용 페이지예요.</div>;
  }
  const coachName = user?.unsafeMetadata?.name || user?.firstName || "코치";
  const athlete = await getAthleteByRef(id); // id=pageId 우선, 옛 이메일 링크도 하위호환
  if (!athlete) return <CoachShell active="athletes" coachName={coachName}><div className="p-10 text-center text-sm text-muted-foreground">선수를 찾을 수 없어요.</div></CoachShell>;
  const email = athlete.email || "";

  const [sessions, timeline, calEvents] = await Promise.all([
    athlete.pageId ? getSessionsByAthlete(athlete.pageId) : [],
    getLogTimeline(email, kstToday(), 7),
    athlete.pageId ? getAthleteEvents(athlete.pageId) : [],
  ]);
  const assets = resolveAssets(athlete);
  const pubSet = new Set((athlete.publishedReports || []).map(String));
  const latestSessionId = sessions[0]?.id || "";
  const nextGuideSession = sessions.find((s) => !(s.published || s.hasNote))?.id || ""; // 아직 안 끝난 세션의 가이드 준비
  const chips = [athlete.sport, athlete.tier, athlete.program].filter(Boolean).join(" · ");

  return (
    <CoachShell active="athletes" coachName={coachName}>
      <div className="px-5 lg:px-7 py-6 max-w-[1440px]">
        {/* 헤더 */}
        <div className="flex items-start justify-between gap-4 mb-5">
          <div className="min-w-0">
            <div className="text-[12.5px] text-[#9298a2] mb-1"><Link href="/portal" className="hover:text-primary">대시보드</Link> › 선수 › {athlete.name || email}</div>
            <h1 className="text-[22px] font-extrabold text-[#1b2a3f] tracking-[-0.3px]">{athlete.name || email} <span className="text-[13px] font-semibold text-[#9298a2]">{athlete.status || ""}{chips ? " · " + chips : ""}</span></h1>
          </div>
          <div className="flex items-center gap-2 flex-none">
            <Link href={`/portal?as=${athlete.pageId}`} target="_blank" className="inline-flex items-center gap-1.5 text-[12.5px] font-bold text-[#3a3f48] border border-[#d9dce1] rounded-lg px-3 py-2 bg-white"><Eye className="w-4 h-4" />선수 화면</Link>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-[18px] items-start">
          {/* 좌: 세션 + 로그 */}
          <div className="flex flex-col gap-[18px]">
            <Panel title="세션" right={nextGuideSession ? <Link href={`/coach/session/${nextGuideSession}`} className="inline-flex items-center gap-1.5 text-[12px] font-bold text-white bg-primary rounded-lg px-2.5 py-1.5"><Sparkles className="w-3.5 h-3.5" />다음 세션 가이드 준비</Link> : null}>
              {sessions.length === 0 ? (
                <div className="py-10 text-center text-[13px] text-muted-foreground">아직 세션이 없어요.</div>
              ) : sessions.map((s) => {
                const done = s.published || s.hasNote; // 세션 종료(노트 있음/공개)
                const status = s.published ? { t: "공개됨", c: "bg-[#e7f4ec] text-[#1f8a4c]" } : s.hasNote ? { t: "노트 검토중", c: "bg-[#eef0fb] text-primary" } : s.hasGuide ? { t: "가이드 준비됨", c: "bg-[#e8f5fb] text-[#2a7fa5]" } : { t: "준비 전", c: "bg-[#eef0f3] text-[#6b7280]" };
                return (
                  <div key={s.id} className="flex items-center gap-3 px-4 py-3.5 border-t border-[#e7e9ed] first:border-t-0">
                    <span className="w-9 h-9 rounded-lg bg-[#eef0fb] text-primary text-[12px] font-extrabold flex items-center justify-center flex-none">{s.n ?? "-"}회</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[14px] font-bold text-[#1b2a3f] flex items-center gap-2">{s.n ? `${s.n}회차 코칭 세션` : (s.title || "코칭 세션")}<span className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full ${status.c}`}>{status.t}</span></div>
                      <div className="text-[12.5px] text-[#9298a2] mt-0.5">{md(s.date) || "날짜 미정"}</div>
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
            </Panel>

            <Panel title="수면 · 루틴 로그" right={<span className="text-[12px] text-[#9298a2] font-semibold">최근 7일</span>}>
              <div className="p-4">
                <LogTimelinePanel cols={timeline.cols} sleeps={timeline.sleeps} routines={timeline.routines} compactHeight={720} />
              </div>
            </Panel>

            <CoachScheduleEditor masterPageId={athlete.pageId} events={calEvents} athleteName={athlete.name || email} today={kstToday()} />
          </div>

          {/* 우: 배정·상태 / 리포트 / 설문 */}
          <div className="flex flex-col gap-[18px]">
            <Panel title="배정 · 상태">
              <div className="p-4">
                <CoachManageForm athlete={{ pageId: athlete.pageId, nextSession: athlete.nextSession, status: athlete.status, program: athlete.program }} />
              </div>
            </Panel>

            <Panel title="공개 리포트">
              {assets.reports.length === 0 ? (
                <div className="p-4 text-[13px] text-muted-foreground">아직 등록된 리포트가 없어요.</div>
              ) : assets.reports.map((r) => (
                <div key={r.slug} className="flex items-center gap-3 px-4 py-3.5 border-t border-[#e7e9ed] first:border-t-0">
                  <div className="flex-1 min-w-0"><div className="text-[14px] font-semibold text-[#1b2a3f] truncate">{r.label}</div>{(r.badge || r.date) ? <div className="text-[12px] text-[#9298a2] mt-0.5">{[r.badge, r.date].filter(Boolean).join(" · ")}</div> : null}</div>
                  <ReportPublishToggle email={athlete.email} uid={athlete.clerkUserId} slug={r.slug} initialOn={pubSet.has(r.slug)} />
                </div>
              ))}
            </Panel>

            <Panel title="부가자료" right={<span className="text-[12px] text-[#9298a2] font-semibold">{assets.extras?.length || 0}개</span>}>
              {(!assets.extras || assets.extras.length === 0) ? (
                <div className="p-4 text-[13px] text-muted-foreground">아직 등록된 부가자료가 없어요.</div>
              ) : assets.extras.map((x) => (
                <a key={x.url} href={x.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-4 py-3.5 border-t border-[#e7e9ed] first:border-t-0 hover:bg-[#fafbfc]">
                  <div className="flex-1 min-w-0"><div className="text-[14px] font-semibold text-[#1b2a3f] truncate">{x.label}</div>{x.desc ? <div className="text-[12px] text-[#9298a2] mt-0.5 truncate">{x.desc}</div> : null}</div>
                  <span className="text-[#9298a2]">→</span>
                </a>
              ))}
            </Panel>

            <Panel title="사전 설문 요약" right={<span className="text-[12px] text-[#c2c7cf] font-semibold">준비중</span>}>
              <div className="p-4 text-[13px] text-muted-foreground leading-relaxed">설문 데이터 요약은 다음 단계에서 연동돼요.</div>
            </Panel>
          </div>
        </div>
      </div>
    </CoachShell>
  );
}
