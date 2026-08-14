// 선수 개인 포털 — 홈 탭 (디자인 시스템 v2 · 프리미티브 적용)
// 상태 분기: 온보딩(첫 세션 전) / 정식(첫 세션 후). 데이터=마스터(단일 소스)+Clerk 폴백.
// 코치 이메일이면 코치 대시보드(별도), ?as=<이메일>이면 그 선수 미리보기.
import { currentUser, clerkClient } from "@clerk/nextjs/server";
import { Calendar, Upload } from "lucide-react";
import CoachDashboard from "../../components/coach/CoachDashboard";
import { isCoachEmail, COACH_EMAILS } from "../../lib/coach";
import Link from "next/link";
import { getAthleteByEmail, getSessionsByAthlete, getAllAthletes } from "../../lib/master";
import { getAthleteEvents } from "../../lib/calendar";
import { kstToday } from "../../lib/log";

const TYPE_COLOR = { 세션: "#4355B0", 프로토콜: "#8E9BE8", 과제: "#9aa0ab", 경기: "#F4978E", 이동: "#7EC8E3", 훈련: "#A0B0FF", 기타: "#6b7280" };
import AppShell, { AppBody } from "../../components/app/AppShell";
import Hero from "../../components/app/Hero";
import { Surface, SectionHeader, Row, StatusBadge, Metric, MetricRow, ReportRow, CheckRow } from "../../components/app/primitives";

const MASTER_DONE_STATES = ["intake제출", "온보딩완료", "진행중", "종료"];
const CLIENT = { name: "선수" };

async function getClerk() {
  return typeof clerkClient === "function" ? await clerkClient() : clerkClient;
}

// 코치 대시보드용 선수 목록 — Neon clients(단일 소스). 코치 본인/다른 코치 제외. 실패 시 빈 배열.
// 정렬: 진행중 → 온보딩/설문 → 대기 순, 같은 그룹은 다음 세션 가까운 순.
const INTAKE_DONE_STATES = ["intake제출", "온보딩완료", "진행중", "종료"];
const ONGOING_STATES = ["진행중", "종료"];
function progShort(program) {
  if (!program) return "미정";
  return /(\d+주)/.exec(program)?.[1] || (program.includes("케어") ? "케어" : program);
}
async function getAthletes() {
  try {
    const rows = await getAllAthletes();
    const list = rows
      .filter((a) => a.email && !COACH_EMAILS.includes(String(a.email).toLowerCase()))
      .map((a) => ({
        uid: a.pageId,
        email: a.email,
        name: a.name || a.email.split("@")[0],
        status: a.status || "",
        intakeDone: INTAKE_DONE_STATES.includes(a.status),
        ongoing: ONGOING_STATES.includes(a.status),
        nextSession: a.nextSession || "",
        sessionLabel: a.nextSession ? mmdd(a.nextSession) : "",
        programLabel: progShort(a.program),
        sport: a.sport || "",
      }));
    const rank = (a) => (a.ongoing ? 0 : a.intakeDone ? 1 : 2);
    list.sort((x, y) => rank(x) - rank(y) || (x.nextSession && y.nextSession ? x.nextSession.localeCompare(y.nextSession) : x.nextSession ? -1 : y.nextSession ? 1 : x.name.localeCompare(y.name)));
    return list;
  } catch (e) {
    console.error("getAthletes(Neon) failed:", e?.message);
    return [];
  }
}

const DOW = ["일", "월", "화", "수", "목", "금", "토"];
function ymd(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || "");
  return m ? { y: +m[1], mo: +m[2], d: +m[3] } : null;
}
function mmdd(iso) { const p = ymd(iso); return p ? `${String(p.mo).padStart(2, "0")}.${String(p.d).padStart(2, "0")}` : ""; }
function fullDate(iso) {
  const p = ymd(iso); if (!p) return "";
  const dow = DOW[new Date(Date.UTC(p.y, p.mo - 1, p.d)).getUTCDay()];
  return `${p.mo}월 ${p.d}일(${dow}) 오전 10시`;
}
function ddayOf(iso) {
  const p = ymd(iso); if (!p) return null;
  const target = Date.UTC(p.y, p.mo - 1, p.d);
  const n = new Date();
  const today = Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate());
  return Math.round((target - today) / 86400000);
}

export const dynamic = "force-dynamic";

export default async function PortalPage({ searchParams }) {
  const user = await currentUser();
  const myEmail = user?.emailAddresses?.[0]?.emailAddress;

  // 코치면 대시보드(별도 콘솔). ?as=<이메일>이면 그 선수 미리보기.
  const previewEmail = isCoachEmail(myEmail) && searchParams?.as ? String(searchParams.as) : null;
  if (isCoachEmail(myEmail) && !previewEmail) {
    const athletes = await getAthletes();
    const coachName = user?.unsafeMetadata?.name || user?.firstName || myEmail?.split("@")[0] || "코치";
    return <CoachDashboard coachName={coachName} athletes={athletes} />;
  }

  // 마스터(단일 소스) 조회. 없으면 Clerk 폴백.
  const lookupEmail = previewEmail || myEmail;
  const athlete = lookupEmail ? await getAthleteByEmail(lookupEmail) : null;
  const meta = user?.publicMetadata || {};
  const masterDone = athlete?.status ? MASTER_DONE_STATES.includes(athlete.status) : null;

  const clientName = athlete?.name || user?.unsafeMetadata?.name || user?.firstName || myEmail?.split("@")[0] || CLIENT.name;
  // 설문(인테이크) 완료 — 마스터 상태·인테이크 relation·Clerk 메타 중 하나라도 있으면 완료로.
  // (마스터 행이 있어도 Clerk intakeDone을 무시하지 않게: 어느 소스든 양성이면 체크)
  const intakeDone = !!(masterDone || (athlete?.relations?.intake?.length) || meta.intakeDone === true || searchParams?.stage === "done");
  // 자료 업로드 완료 — 마스터 준비자료 relation 또는 Clerk 메타.
  const prepDone = !!((athlete?.relations?.prep?.length) || meta.prepDone === true);

  // ongoing = 상태(진행중/종료) 기반 (Neon 이전으로 세션 relation 없음). 세션 수는 아래 실제 목록에서.
  const ongoing = ["진행중", "종료"].includes(athlete?.status) || searchParams?.stage === "ongoing";

  const nextSessionAt = athlete?.nextSession || (ongoing ? null : meta.firstSessionAt) || (searchParams?.stage === "done" ? "2026-08-09" : null);
  const programWeeks = meta.programWeeks || ((searchParams?.stage === "done" || searchParams?.stage === "ongoing") ? 8 : null);
  // 프로그램: 마스터 선택값(3주 수면 리셋/8주 수면 셋업/수면 케어) → 히어로엔 짧게(3주·8주·케어). 없으면 주차 폴백.
  const programLabel = athlete?.program
    ? (/(\d+주)/.exec(athlete.program)?.[1] || (athlete.program.includes("케어") ? "케어" : athlete.program))
    : (programWeeks ? `${programWeeks}주` : "미정");
  const scheduleDone = !!nextSessionAt;
  const dday = ddayOf(nextSessionAt);
  const ddayText = dday === null ? "미정" : dday > 0 ? `D-${dday}` : dday === 0 ? "D-day" : "진행중";

  // 지난 세션 + 다가오는 일정 — 둘 다 pageId만 필요하고 서로 독립이라 병렬 조회 (waterfall 제거)
  const [sessions, calEvents] = ongoing && athlete?.pageId
    ? await Promise.all([
        getSessionsByAthlete(athlete.pageId),
        getAthleteEvents(athlete.pageId, { forAthlete: true }),
      ])
    : [[], []];
  const effectiveCount = sessions.length || (searchParams?.stage === "ongoing" ? 1 : 0);
  const nextOrdinal = effectiveCount + 1;
  const upcoming = calEvents.filter((e) => e.kind === "event" && (e.end || e.start).slice(0, 10) >= kstToday()).slice(0, 4);

  const statusLabel = ongoing ? "코칭 진행중" : intakeDone ? "첫 세션 준비 중" : "시작 준비";
  const showMetrics = intakeDone || ongoing;

  return (
    <AppShell>
      <Hero
        badge={statusLabel}
        name={clientName}
        roleSuffix="선수"
        sub={!showMetrics ? "첫 세션을 준비해요" : undefined}
      >
        {showMetrics ? (
          <MetricRow>
            <Metric value={ddayText} label="다음 세션" valueClassName="text-accent" labelClassName="text-white/60" />
            <Metric value={effectiveCount} unit="회" label="진행 세션" valueClassName="text-white" labelClassName="text-white/60" />
            <Metric value={programLabel} label="프로그램" valueClassName="text-white" labelClassName="text-white/60" />
          </MetricRow>
        ) : null}
      </Hero>

      <AppBody>
        {!ongoing ? (
          /* ── 온보딩 홈: 첫 세션 전까지 유지되는 준비 체크리스트 (항목별 독립 완료) ── */
          <>
            <SectionHeader title="첫 세션 준비" caption="아래를 준비하면 첫 세션 준비 끝이에요." className="mt-6" />
            <Surface>
              <CheckRow title="사전 수면 설문 작성" desc={intakeDone ? "완료" : "68문항 · 약 15분"} done={intakeDone} href={intakeDone ? undefined : "/athlete"} />
              <CheckRow
                title="첫 세션 일정 잡기"
                desc={scheduleDone ? fullDate(nextSessionAt) : "코치가 일정을 잡아드려요"}
                done={scheduleDone}
              />
              <CheckRow title="도움될 자료 업로드" desc={prepDone ? "완료" : "경기·훈련·수면 관련 자료"} done={prepDone} href={prepDone ? undefined : "/prep"} />
            </Surface>
          </>
        ) : (
          /* ── 정식 세션 홈 (첫 세션 후) / 첫 세션 준비 중 ── */
          <>
            <SectionHeader title="다음 세션" className="mt-6" />
            <Surface>
              <div className="p-4">
                <div className="flex items-center gap-2.5 text-primary">
                  <Calendar className="w-[22px] h-[22px]" strokeWidth={2} />
                  <StatusBadge>{nextOrdinal}회차</StatusBadge>
                </div>
                <div className="text-lg font-bold text-foreground mt-[11px] tracking-[-0.3px]">
                  {nextSessionAt ? fullDate(nextSessionAt) : "일정 조율 중"}
                </div>
                <div className="text-[13px] text-muted-foreground mt-1">
                  {nextSessionAt ? `${ddayText} · ${nextOrdinal}회차 코칭 세션` : `${nextOrdinal}회차 코칭 세션은 코치와 조율 중이에요`}
                </div>
              </div>
              <Row icon={Upload} action sub title="코칭 준비 자료 올리기" href="/prep" />
            </Surface>

            {ongoing ? (
              <>
                <SectionHeader title="다가오는 일정" right={<Link href="/schedule" className="text-[13px] font-semibold text-primary">전체</Link>} />
                <Surface>
                  {upcoming.length ? upcoming.map((e) => {
                    const dd = ddayOf(e.start);
                    return (
                      <Link key={e.id} href="/schedule" className="flex items-center gap-3 p-4 first:border-t-0 border-t border-border active:bg-muted/40 transition-colors">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: TYPE_COLOR[e.type] || "#6b7280" }} />
                        <div className="flex-1 min-w-0">
                          <div className="text-[15px] font-semibold text-foreground">{e.title}</div>
                          <div className="text-[13px] text-muted-foreground mt-0.5">{e.type}{e.source === "선수" ? " · 내가 추가" : ""}</div>
                        </div>
                        <div className="text-[12px] font-semibold text-[#9aa0ab] shrink-0">{dd > 0 ? `D-${dd}` : dd === 0 ? "D-day" : ""}</div>
                      </Link>
                    );
                  }) : <Link href="/schedule" className="block p-4 text-[13px] text-muted-foreground active:bg-muted/40">예정된 일정이 없어요. 내 경기·이동 일정을 추가해보세요.</Link>}
                </Surface>
              </>
            ) : null}

            {sessions.length > 0 ? (
              <>
                <SectionHeader title="지난 세션" />
                <Surface>
                  {sessions.map((s) => (
                    <ReportRow
                      key={s.id}
                      date={mmdd(s.date)}
                      badge={s.n ? `${s.n}회차` : undefined}
                      title={s.n ? `${s.n}회차 코칭 세션` : (s.title || "코칭 세션")}
                      sub="코칭 노트 보기"
                      href={`/session/${s.id}`}
                    />
                  ))}
                </Surface>
              </>
            ) : null}
          </>
        )}
      </AppBody>
    </AppShell>
  );
}
