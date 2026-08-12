// 선수 개인 포털 — 홈 탭 (디자인 시스템 v2 · 프리미티브 적용)
// 상태 분기: 온보딩(첫 세션 전) / 정식(첫 세션 후). 데이터=마스터(단일 소스)+Clerk 폴백.
// 코치 이메일이면 코치 대시보드(별도), ?as=<이메일>이면 그 선수 미리보기.
import { currentUser, clerkClient } from "@clerk/nextjs/server";
import { Calendar, Upload } from "lucide-react";
import CoachDashboard from "../../components/coach/CoachDashboard";
import { isCoachEmail, COACH_EMAILS } from "../../lib/coach";
import { getAthleteByEmail, getSessionsByAthlete } from "../../lib/master";
import AppShell, { AppBody } from "../../components/app/AppShell";
import Hero from "../../components/app/Hero";
import { Surface, SectionHeader, Row, StatusBadge, Metric, MetricRow, ReportRow, CheckRow } from "../../components/app/primitives";

const MASTER_DONE_STATES = ["intake제출", "리포트게시", "온보딩완료", "진행중", "종료"];
const CLIENT = { name: "선수" };

async function getClerk() {
  return typeof clerkClient === "function" ? await clerkClient() : clerkClient;
}

// 코치 대시보드용 선수 목록 (코치 본인·다른 코치 제외). 실패 시 빈 배열.
async function getAthletes() {
  try {
    const cc = await getClerk();
    const res = await cc.users.getUserList({ limit: 200, orderBy: "-created_at" });
    const list = Array.isArray(res) ? res : res?.data || [];
    return list
      .filter((u) => {
        const em = u?.emailAddresses?.[0]?.emailAddress;
        return em && !COACH_EMAILS.includes(String(em).toLowerCase());
      })
      .map((u) => ({
        uid: u.id,
        name: u?.unsafeMetadata?.name || u?.firstName || u?.username || u?.emailAddresses?.[0]?.emailAddress?.split("@")[0] || "이름 미상",
        email: u?.emailAddresses?.[0]?.emailAddress || "",
        intakeDone: u?.publicMetadata?.intakeDone === true,
        prepDone: u?.publicMetadata?.prepDone === true,
        firstSessionAt: u?.publicMetadata?.firstSessionAt || "",
        sessionLabel: u?.publicMetadata?.sessionLabel || "",
        programWeeks: u?.publicMetadata?.programWeeks || "",
        reportUrl: u?.publicMetadata?.reportUrl || "",
        guideUrl: u?.publicMetadata?.guideUrl || "",
        dataUrl: u?.publicMetadata?.dataUrl || "",
      }));
  } catch {
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

  const sessionCount = athlete?.relations?.sessions?.length || 0;
  const ongoing = (!!athlete && sessionCount >= 1) || searchParams?.stage === "ongoing";
  const effectiveCount = sessionCount || (searchParams?.stage === "ongoing" ? 1 : 0);
  const nextOrdinal = effectiveCount + 1;

  const nextSessionAt = athlete?.nextSession || (ongoing ? null : meta.firstSessionAt) || (searchParams?.stage === "done" ? "2026-08-09" : null);
  const programWeeks = meta.programWeeks || ((searchParams?.stage === "done" || searchParams?.stage === "ongoing") ? 8 : null);
  const scheduleDone = !!nextSessionAt;
  const dday = ddayOf(nextSessionAt);
  const ddayText = dday === null ? "미정" : dday > 0 ? `D-${dday}` : dday === 0 ? "D-day" : "진행중";

  // 정식(ongoing)이면 지난 세션 목록 (마스터 pageId로 코칭 세션 DB 조회)
  const sessions = ongoing && athlete?.pageId ? await getSessionsByAthlete(athlete.pageId) : [];

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
            <Metric value={programWeeks || "미정"} unit={programWeeks ? "주" : ""} label="프로그램" valueClassName="text-white" labelClassName="text-white/60" />
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
