// app/coach/clients/[id]/page.js — 코치 콘솔 · 선수 상세 (데스크탑 2단). 코치 전용.
// [id] = 마스터 pageId(UUID). 이메일 대신 불투명 id로 라우팅(URL에 PII 노출 안 함).
import { currentUser } from "@clerk/nextjs/server";
import Link from "next/link";
import { ChevronRight, Eye, Sparkles, Paperclip } from "lucide-react";
import { isCoachEmail } from "../../../../lib/coach";
import { getAthleteByRef, getSessionsByAthlete } from "../../../../lib/master";
import { getAthleteEvents } from "../../../../lib/calendar";
import { getSleepTargets, adherence, getAppliedProtocolSlugs } from "../../../../lib/targets";
import { getLogTimeline, kstToday } from "../../../../lib/log";
import { getAttachments } from "../../../../lib/attachments";
import { resolveAssets, reportSlug } from "../../../../lib/athleteAssets";
import { readFile } from "node:fs/promises";
import path from "node:path";
import CoachShell from "../../../../components/coach/CoachShell";
import CoachManageForm from "../../../../components/coach/CoachManageForm";
import CoachScheduleEditor from "../../../../components/coach/CoachScheduleEditor";
import ReportPublishToggle from "../../../../components/coach/ReportPublishToggle";
import LogTimelinePanel from "../../../../components/coach/LogTimelinePanel";
import ProtocolCompare from "../../../../components/coach/ProtocolCompare";

// 부가자료 HTML에 프로토콜 목표(#protocol-targets)가 있으면 정보 반환
async function protocolInfo(slug) {
  if (!/^[a-z0-9-]+$/i.test(slug)) return null;
  try {
    const html = await readFile(path.join(process.cwd(), "coach-assets", `${slug}.html`), "utf8");
    const m = /<script id="protocol-targets"[^>]*>([\s\S]*?)<\/script>/i.exec(html);
    if (!m) return null;
    const data = JSON.parse(m[1].trim());
    return Array.isArray(data.targets) && data.targets.length ? { count: data.targets.length } : null;
  } catch { return null; }
}

export const metadata = { title: "선수 상세 | NOCT" };
export const dynamic = "force-dynamic";
const DOW = ["일", "월", "화", "수", "목", "금", "토"];
const md = (iso) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || ""); return m ? `${+m[2]}월 ${+m[3]}일 (${DOW[new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])).getUTCDay()]})` : ""; };
const kstDT = (d) => { if (!d) return ""; try { return new Date(d).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }); } catch { return ""; } };
const fileProxy = (u) => `/api/coach/file?u=${encodeURIComponent(u)}`;
const UPKIND = { prep: { t: "코칭 준비자료", c: "bg-[#e8f1fe] text-[#2563c9]" }, garmin: { t: "가민 데이터", c: "bg-[#eaf7ef] text-[#1f8a4c]" } };

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

  const [sessions, calEvents, sleepTargets] = await Promise.all([
    athlete.pageId ? getSessionsByAthlete(athlete.pageId) : [],
    athlete.pageId ? getAthleteEvents(athlete.pageId) : [],
    athlete.pageId ? getSleepTargets(athlete.pageId) : [],
  ]);
  // 타임라인 기간: 최근 7일 + 프로토콜 미래 목표일까지(있으면) → 우측 스크롤로 예정 확인
  const today = kstToday();
  const dayDiff = (a, b) => Math.round((Date.parse(a) - Date.parse(b)) / 86400000);
  const maxTargetDate = sleepTargets.reduce((m, t) => (t.date > m ? t.date : m), today);
  const endDate = maxTargetDate > today ? maxTargetDate : today;
  const numDays = 7 + Math.max(0, dayDiff(endDate, today));
  const timeline = await getLogTimeline(email, endDate, numDays);
  const uploads = await getAttachments(email);
  // 프로토콜 목표 vs 실제 순응도(실제 로그 있는 날 기준)
  const sleepByDate = Object.fromEntries((timeline.sleeps || []).map((s) => [s.date, s]));
  const targetSummary = adherence(sleepTargets, sleepByDate);
  const assets = resolveAssets(athlete);
  // 프로토콜 비교 가능한 부가자료(목표 있는 것) + 현재 적용된 것
  const protocolExtras = [];
  for (const e of (assets.extras || [])) {
    const slug = reportSlug(e.url);
    const info = await protocolInfo(slug);
    if (info) protocolExtras.push({ slug, label: e.label, targetCount: info.count });
  }
  const appliedProtocols = athlete.pageId ? await getAppliedProtocolSlugs(athlete.pageId) : [];
  const pubSet = new Set((athlete.publishedReports || []).map(String));
  const latestSessionId = sessions[0]?.id || "";
  // 최고 회차가 아직 안 끝났을 때만 '다음 세션 가이드 준비' 대상. (중간에 미공개로 남은 과거 세션으로 새지 않게)
  const nextGuideSession = sessions[0] && !(sessions[0].published || sessions[0].hasNote) ? sessions[0].id : "";
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

            <Panel title="수면 · 루틴 로그" right={<span className="text-[12px] text-[#9298a2] font-semibold">최근 7일{endDate > today ? " + 예정" : ""} · 우측 스크롤</span>}>
              <div className="p-4">
                <LogTimelinePanel cols={timeline.cols} sleeps={timeline.sleeps} routines={timeline.routines} targets={sleepTargets} summary={targetSummary} compactHeight={720} />
              </div>
            </Panel>

            <Panel title="선수가 올린 자료" right={<span className="text-[12px] text-[#9298a2] font-semibold">{uploads.length}개</span>}>
              {uploads.length === 0 ? (
                <div className="p-4 text-[13px] text-muted-foreground">아직 선수가 올린 자료가 없어요. (코칭 준비자료·첨부 제출 시 여기에 쌓여요)</div>
              ) : uploads.map((u) => {
                const k = UPKIND[u.kind] || { t: u.kind, c: "bg-[#eef0f3] text-[#6b7280]" };
                return (
                  <div key={u.id} className="px-4 py-3.5 border-t border-[#e7e9ed] first:border-t-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full ${k.c}`}>{k.t}</span>
                      <span className="text-[12px] text-[#9298a2] font-semibold">{kstDT(u.createdAt)}</span>
                    </div>
                    {u.items?.length ? (
                      <ul className="text-[13px] text-[#2a3340] leading-relaxed mb-1.5 space-y-0.5">
                        {u.items.map((it, i) => (<li key={i}>· {it.type ? `[${it.type}] ` : ""}{it.text}</li>))}
                      </ul>
                    ) : null}
                    {u.files?.length ? (
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {u.files.map((f, i) => (
                          <a key={i} href={fileProxy(f.url)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[12px] font-semibold text-primary bg-[#eef0fb] rounded-lg px-2.5 py-1.5 max-w-full">
                            <Paperclip className="w-3.5 h-3.5 flex-none" /><span className="truncate">{f.name || "첨부"}</span>
                          </a>
                        ))}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </Panel>

            <Panel title="프로토콜 비교 목표" right={<span className="text-[12px] text-[#9298a2] font-semibold">부가자료 → 비교에 적용</span>}>
              <ProtocolCompare clientId={athlete.pageId} protocols={protocolExtras} applied={appliedProtocols} />
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
