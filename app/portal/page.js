/*
  선수 개인 포털 — 수면관리 허브 (1차 마일스톤 UI)
  ─────────────────────────────────────────────
  로그인 후 이 허브가 뜬다. 디자인 = athlete-demo/index.html (박수민 데모) 포팅 + NOCT-UI-GUIDE.
  스타일은 .noct-hub 스코프로 격리.

  ⚠️ 상태(여정 단계)에 따라 화면이 달라진다:
    - intake 미완료 → "사전 질문지 작성" CTA (→ /athlete). 여정 1단계 활성.
    - intake 완료   → 첫 세션 준비 상태 (리포트/기록은 세션 후 오픈).
  미리보기: /portal (미완료 기본) · /portal?stage=done (완료)

  ⚠️ 지금은 목업. 2단계에서 Clerk 로그인 + Notion(클라이언트 마스터, 상태=여정단계) 배선으로 교체.
*/

import { currentUser, clerkClient } from "@clerk/nextjs/server";
import LogoutButton from "../../components/portal/LogoutButton";
import CoachDashboard from "../../components/coach/CoachDashboard";
import { isCoachEmail, COACH_EMAILS } from "../../lib/coach";
import { resolveAssets, publishedReportSet } from "../../lib/athleteAssets";
import { getAthleteByEmail } from "../../lib/master";

// 마스터 `상태` → intake 완료(여정 done) 여부. 초대됨/로그인 = 미완료, 그 이후 = 완료.
const MASTER_DONE_STATES = ["intake제출", "리포트게시", "온보딩완료", "진행중", "종료"];

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
        name:
          u?.unsafeMetadata?.name ||
          u?.firstName ||
          u?.username ||
          u?.emailAddresses?.[0]?.emailAddress?.split("@")[0] ||
          "이름 미상",
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

const CLIENT = { name: "김프로", role: "선수", program: "운동선수 수면 코칭" };

// ── intake 미완료 상태 데이터 ──
const JOURNEY_PRE = [
  { cls: "now", stage: "지금 할 일", tt: "사전 수면 질문지 작성", td: "68문항으로 지금 수면 상태를 네 영역으로 진단해요." },
  { cls: "", stage: "이번 주 일요일(8월 9일) · 오전 10시", tt: "첫 코칭 세션", td: "진단 결과와 첫 수면 리포트를 같이 보면서 앞으로의 방향을 잡아요." },
  { cls: "", stage: "세션 후", tt: "매일 기록이 시작돼요", td: "수면 로그·루틴·워치 데이터 업로드가 열려요. 하루 한 번, 30초면 충분해요." },
  { cls: "", stage: "다음 · 최종 목표", tt: "흔들리지 않는 나만의 회복 루틴", td: "첫 세션에서 목표를 함께 정하고, 이 자리에 나만의 목표가 하나씩 채워질 거예요." },
];

// ── intake 완료 상태 KPI는 PortalPage에서 선수별 metadata로 동적 생성 (아래) ──
const JOURNEY_DONE = [
  { cls: "", stage: "시작 · 오늘", tt: "사전 질문지를 완료했어요", td: "68문항으로 지금 수면 상태를 네 영역으로 진단했어요. 코치가 결과를 살펴보고 있어요." },
  { cls: "now", stage: "이번 주 일요일(8월 9일) · 오전 10시", tt: "첫 코칭 세션에서 리포트를 함께 봐요", td: "진단 결과와 첫 수면 리포트를 같이 보면서 앞으로의 방향을 잡아요." },
  { cls: "", stage: "세션 후", tt: "매일 기록이 시작돼요", td: "세션이 끝나면 수면 로그·루틴·워치 데이터 업로드가 열려요. 하루 한 번, 30초면 충분해요." },
  { cls: "", stage: "다음 · 최종 목표", tt: "흔들리지 않는 나만의 회복 루틴", td: "첫 세션에서 목표를 함께 정하고, 이 자리에 나만의 목표가 하나씩 채워질 거예요." },
];

// 세션 후 열리는 기능들 (지금은 전부 잠금)
const SPACE = [
  { h: "내 수면 리포트", p: "세션에서 코치와 함께 첫 리포트를 열어봐요." },
  { h: "수면 로그", p: "매일 잘 잔 정도를 30초로 가볍게 기록해요." },
  { h: "루틴 기록", p: "코치가 정해준 취침 루틴을 체크해요." },
  { h: "데이터 업로드", p: "워치 수면 화면을 캡처해서 올려요." },
];

const CSS = `
.noct-hub{
  --soft:#F6F7F9;--ink:#111;--navy:#0D1B2A;--gray:#6b7280;--gray2:#9aa3ad;
  --line:#e9e9ee;--indigo:#4355B0;--sky:#7EC8E3;--lav:#A0B0FF;--coral:#F4978E;
  --grad:linear-gradient(90deg,#4355B0,#7EC8E3);
  font-family:'Pretendard Variable','Pretendard',-apple-system,BlinkMacSystemFont,sans-serif;
  background:#F2F3F6;color:var(--ink);line-height:1.5;min-height:100vh;
  -webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;
}
.noct-hub .wrap{max-width:960px;margin:0 auto;padding:36px 24px 72px;}

/* Hero */
.noct-hub .hero{position:relative;overflow:hidden;border-radius:24px;padding:32px 34px 30px;
  background:linear-gradient(135deg,#0D1B2A 0%,#22356d 100%);color:#fff;
  box-shadow:0 18px 50px rgba(13,27,42,.22);}
.noct-hub .hero::after{content:"";position:absolute;right:-90px;top:-130px;width:360px;height:360px;
  border-radius:50%;background:radial-gradient(circle,rgba(126,200,227,.30),transparent 70%);pointer-events:none;}
.noct-hub .hero-top{display:flex;justify-content:space-between;align-items:center;gap:12px;position:relative;z-index:1;}
.noct-hub .hero .logo{height:17px;display:block;filter:brightness(0) invert(1);opacity:.94;}
.noct-hub .status{display:inline-flex;align-items:center;gap:8px;font-size:12.5px;font-weight:700;color:#c4e7f5;
  background:rgba(126,200,227,.14);border:1px solid rgba(126,200,227,.42);padding:7px 14px;border-radius:999px;white-space:nowrap;}
.noct-hub .status .dot{width:8px;height:8px;border-radius:50%;background:#46d39a;box-shadow:0 0 0 3px rgba(70,211,154,.22);}
.noct-hub .logout{display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;padding:0;
  border-radius:50%;color:rgba(255,255,255,.55);background:transparent;border:1px solid rgba(255,255,255,.15);
  cursor:pointer;transition:background .15s,color .15s,border-color .15s;position:relative;z-index:1;}
.noct-hub .logout:hover{background:rgba(255,255,255,.1);color:rgba(255,255,255,.92);border-color:rgba(255,255,255,.28);}
.noct-hub .hero-status{margin-top:16px;position:relative;z-index:1;}
.noct-hub .hero-name{font-size:33px;font-weight:800;letter-spacing:-0.9px;margin-top:18px;position:relative;z-index:1;}
.noct-hub .hero-name span{color:rgba(255,255,255,.62);font-size:19px;font-weight:600;margin-left:4px;}
.noct-hub .hero-coach{font-size:13.5px;color:rgba(255,255,255,.70);margin-top:9px;font-weight:500;position:relative;z-index:1;}
.noct-hub .kpis{display:flex;margin-top:26px;position:relative;z-index:1;flex-wrap:wrap;
  border-top:1px solid rgba(255,255,255,.12);padding-top:22px;}
.noct-hub .kpi{flex:1;min-width:110px;padding:0 24px;border-left:1px solid rgba(255,255,255,.12);}
.noct-hub .kpi:first-child{padding-left:0;border-left:none;}
.noct-hub .kv{display:block;font-size:29px;font-weight:800;letter-spacing:-1px;color:#fff;line-height:1;font-variant-numeric:tabular-nums;}
.noct-hub .kv i{font-style:normal;font-size:14px;font-weight:600;color:rgba(255,255,255,.66);margin-left:3px;}
.noct-hub .kk{display:block;font-size:12.5px;color:rgba(255,255,255,.62);margin-top:8px;font-weight:500;}
.noct-hub .hero-note{display:flex;align-items:center;gap:9px;margin-top:24px;position:relative;z-index:1;
  border-top:1px solid rgba(255,255,255,.12);padding-top:20px;font-size:13px;font-weight:500;color:rgba(255,255,255,.66);line-height:1.5;}
.noct-hub .hero-note svg{color:rgba(126,200,227,.9);flex-shrink:0;}

/* Primary CTA (intake 작성) */
.noct-hub .cta{display:grid;grid-template-columns:52px 1fr 34px;gap:18px;align-items:center;margin-top:22px;
  background:rgba(67,85,176,.055);border:1px solid rgba(67,85,176,.22);border-radius:18px;padding:20px 22px;
  text-decoration:none;color:inherit;transition:transform .16s ease,box-shadow .16s ease,border-color .16s ease;}
.noct-hub .cta:hover{transform:translateY(-2px);box-shadow:0 14px 34px rgba(67,85,176,.16);border-color:rgba(67,85,176,.5);}
.noct-hub .cta-ic{width:52px;height:52px;border-radius:14px;background:var(--grad);color:#fff;display:flex;align-items:center;justify-content:center;}
.noct-hub .cta-t{font-size:16.5px;font-weight:800;color:var(--navy);letter-spacing:-.4px;}
.noct-hub .cta-d{font-size:13px;color:var(--gray);margin-top:4px;line-height:1.5;max-width:520px;}
.noct-hub .cta-go{width:34px;height:34px;border-radius:50%;background:#fff;border:1px solid var(--line);color:var(--indigo);
  display:flex;align-items:center;justify-content:center;transition:background .16s ease,color .16s ease;}
.noct-hub .cta:hover .cta-go{background:var(--indigo);color:#fff;border-color:var(--indigo);}

/* Journey */
.noct-hub .journey{margin-top:40px;}
.noct-hub .sec-label{font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--indigo);margin-bottom:5px;}
.noct-hub .sec-title{font-size:21px;font-weight:800;letter-spacing:-0.4px;color:var(--navy);}
.noct-hub .tl{margin-top:18px;margin-left:12px;}
.noct-hub .tli{position:relative;padding:0 0 24px 28px;border-left:2px solid var(--line);}
.noct-hub .tli:last-child{border-left-color:transparent;padding-bottom:0;}
.noct-hub .tli::before{content:"";position:absolute;left:-6px;top:2px;width:12px;height:12px;border-radius:50%;background:#fff;border:2px solid #cfd3dc;}
.noct-hub .tli.now::before{background:var(--indigo);border-color:var(--indigo);box-shadow:0 0 0 4px rgba(67,85,176,.16);}
.noct-hub .tli .stage{font-size:11.5px;font-weight:800;letter-spacing:.4px;color:var(--gray2);}
.noct-hub .tli.now .stage{color:var(--indigo);}
.noct-hub .tli .tt{font-size:16.5px;font-weight:800;color:var(--navy);margin:3px 0 5px;letter-spacing:-.4px;}
.noct-hub .tli .td{font-size:13.5px;color:var(--gray);line-height:1.58;max-width:600px;}
.noct-hub .tli.goal::before{background:var(--sky);border-color:var(--sky);box-shadow:0 0 0 4px rgba(126,200,227,.22);}
.noct-hub .tli.goal .stage{color:#2f7d9e;}

/* My Space (잠금 카드) */
.noct-hub .space{margin-top:42px;}
.noct-hub .sec-head{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;margin-bottom:18px;}
.noct-hub .count{font-size:12.5px;font-weight:700;color:var(--gray);background:#fff;border:1px solid var(--line);
  padding:6px 13px;border-radius:999px;white-space:nowrap;}
.noct-hub .slist{display:flex;flex-direction:column;gap:14px;}
.noct-hub .scard{display:grid;grid-template-columns:64px 1fr 44px;gap:22px;align-items:center;
  background:transparent;border:1.5px dashed #d3d6de;border-radius:18px;padding:20px 24px;}
.noct-hub .slock{width:40px;height:40px;border-radius:12px;background:#edeef1;color:var(--gray2);
  display:flex;align-items:center;justify-content:center;}
.noct-hub .sbody h3{font-size:17px;font-weight:800;color:var(--gray2);letter-spacing:-.4px;margin-bottom:6px;}
.noct-hub .sbody p{font-size:13px;color:var(--gray2);line-height:1.55;max-width:520px;}
.noct-hub .stag{display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:800;color:var(--gray2);
  background:#edeef1;padding:5px 11px;border-radius:999px;justify-self:end;letter-spacing:.3px;white-space:nowrap;}

/* Footer */
.noct-hub .foot{margin-top:44px;padding-top:20px;border-top:1px solid var(--line);
  font-size:12.5px;color:var(--gray2);display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;}

/* 공개된(잠금 해제) 카드 — 리포트 열림 */
.noct-hub .scard.open{border:1.5px solid rgba(67,85,176,.28);background:rgba(67,85,176,.045);
  text-decoration:none;color:inherit;cursor:pointer;
  transition:transform .16s ease,box-shadow .16s ease,border-color .16s ease;}
.noct-hub .scard.open:hover{transform:translateY(-2px);box-shadow:0 14px 34px rgba(67,85,176,.15);border-color:rgba(67,85,176,.5);}
.noct-hub .scard.open .sopen{width:40px;height:40px;border-radius:12px;background:var(--grad);color:#fff;
  display:flex;align-items:center;justify-content:center;}
.noct-hub .scard.open .sbody h3{color:var(--navy);}
.noct-hub .scard.open .sbody p{color:var(--gray);}
.noct-hub .stag.open{color:var(--indigo);background:rgba(67,85,176,.1);}

/* ===== Report Archive (지수님 허브 미러) ===== */
.noct-hub .archive{margin-top:42px;}
.noct-hub .arc-head{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;margin-bottom:18px;}
.noct-hub .alist{display:flex;flex-direction:column;gap:14px;}
.noct-hub a.acard{display:grid;grid-template-columns:84px 1fr 44px;gap:22px;align-items:center;
  background:#fff;border:1px solid var(--line);border-radius:18px;padding:22px 24px;
  text-decoration:none;color:inherit;transition:transform .16s ease,box-shadow .16s ease,border-color .16s ease;}
.noct-hub a.acard:hover{transform:translateY(-2px);box-shadow:0 14px 34px rgba(13,27,42,.10);border-color:rgba(67,85,176,.34);}
.noct-hub .adate{text-align:left;}
.noct-hub .adate .am{display:block;font-size:15px;font-weight:800;color:var(--navy);letter-spacing:-.4px;}
.noct-hub .adate .ad{display:inline-block;margin-top:7px;font-size:11px;font-weight:800;color:var(--indigo);
  background:rgba(67,85,176,.08);padding:3px 9px;border-radius:6px;letter-spacing:.2px;}
.noct-hub .abody h3{font-size:18.5px;font-weight:800;color:var(--navy);letter-spacing:-.5px;margin-bottom:8px;}
.noct-hub .ameta{display:flex;gap:7px;flex-wrap:wrap;margin-bottom:9px;}
.noct-hub .achip{font-size:11.5px;font-weight:600;color:#4a5160;background:var(--soft);border:1px solid var(--line);
  padding:3px 10px;border-radius:999px;}
.noct-hub .abody p{font-size:13.5px;color:var(--gray);line-height:1.55;max-width:560px;}
.noct-hub .ago{width:44px;height:44px;border-radius:50%;background:rgba(67,85,176,.08);color:var(--indigo);
  display:flex;align-items:center;justify-content:center;
  transition:background .16s ease,color .16s ease,transform .16s ease;}
.noct-hub a.acard:hover .ago{background:var(--grad);color:#fff;transform:translateX(3px);}
.noct-hub .mcta{display:none;}
.noct-hub .acard.soon{display:grid;grid-template-columns:84px 1fr 44px;gap:22px;align-items:center;
  background:transparent;border:1.5px dashed #d3d6de;border-radius:18px;padding:22px 24px;}
.noct-hub .acard.soon .am{color:var(--gray2);}
.noct-hub .acard.soon .ad{color:var(--gray2);background:#edeef1;}
.noct-hub .acard.soon h3{color:var(--gray2);}
.noct-hub .acard.soon p{color:var(--gray2);}
.noct-hub .acard.soon .ago{background:#edeef1;color:var(--gray2);}

@media (max-width:720px){
  .noct-hub a.acard,.noct-hub .acard.soon{grid-template-columns:56px 1fr;}
  .noct-hub .ago{display:none;}
  .noct-hub .mcta{display:flex;align-items:center;justify-content:space-between;margin-top:14px;padding-top:12px;
    border-top:1px solid var(--line);font-size:13.5px;font-weight:700;color:var(--indigo);}
  .noct-hub .mcta span{font-size:16px;}
  .noct-hub .acard.soon .mcta{display:none;}
  .noct-hub .wrap{padding:24px 24px 56px;}
  .noct-hub .hero{padding:26px 22px;}
  .noct-hub .hero-name{font-size:27px;}
  .noct-hub .kpis{padding-top:16px;gap:0;}
  .noct-hub .kpi{flex:1;min-width:0;padding:0 10px;}
  .noct-hub .kv{font-size:20px;}
  .noct-hub .kv i{font-size:11.5px;margin-left:2px;}
  .noct-hub .kk{font-size:11px;margin-top:6px;}
  .noct-hub .cta{grid-template-columns:48px 1fr;}
  .noct-hub .cta-go{display:none;}
  .noct-hub .scard{grid-template-columns:44px 1fr;}
  .noct-hub .stag{display:none;}
}
`;

function LockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}
function ClipboardIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="M12 11h4" /><path d="M12 16h4" /><path d="M8 11h.01" /><path d="M8 16h.01" />
    </svg>
  );
}
function ArrowIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
    </svg>
  );
}
function ChartIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v16a2 2 0 0 0 2 2h16" /><path d="m7 15 4-4 3 3 5-6" />
    </svg>
  );
}

export default async function PortalPage({ searchParams }) {
  const user = await currentUser();

  // ── 코치 이메일이면 선수 허브 대신 코치 대시보드 ──
  // 단, 코치가 ?as=<선수이메일> 을 붙이면 그 선수의 (마스터 기반) 포털을 미리보기 (코치 전용).
  const myEmail = user?.emailAddresses?.[0]?.emailAddress;
  const previewEmail = isCoachEmail(myEmail) && searchParams?.as ? String(searchParams.as) : null;
  if (isCoachEmail(myEmail) && !previewEmail) {
    const athletes = await getAthletes();
    const coachName =
      user?.unsafeMetadata?.name || user?.firstName || myEmail?.split("@")[0] || "코치";
    return <CoachDashboard coachName={coachName} athletes={athletes} />;
  }

  // ── 마스터(단일 소스) 조회. 있으면 상태·다음세션을 여기서 가져오고, 없으면 Clerk 폴백 ──
  // 코치 미리보기(previewEmail)면 그 이메일로, 아니면 로그인 유저 이메일로 조회.
  const lookupEmail = previewEmail || myEmail;
  const athlete = lookupEmail ? await getAthleteByEmail(lookupEmail) : null;
  const masterDone = athlete?.status ? MASTER_DONE_STATES.includes(athlete.status) : null;

  const clientName =
    athlete?.name ||
    user?.unsafeMetadata?.name ||
    user?.firstName ||
    user?.username ||
    user?.emailAddresses?.[0]?.emailAddress?.split("@")[0] ||
    CLIENT.name;
  // intake 완료 여부: 마스터에 있으면 마스터 `상태`가 진실, 없으면 Clerk publicMetadata. ?stage=done 은 미리보기용
  const done =
    athlete
      ? masterDone
      : user?.publicMetadata?.intakeDone === true || searchParams?.stage === "done";
  const prepDone = user?.publicMetadata?.prepDone === true;

  // ── 세션 진행 상태 ── 마스터 `코칭 세션` relation 개수로 "N회" 카운트. 최소 1회면 진행중(ongoing).
  const sessionCount = athlete?.relations?.sessions?.length || 0;
  const ongoing = (!!athlete && sessionCount >= 1) || searchParams?.stage === "ongoing"; // ?stage=ongoing 미리보기
  const effectiveCount = sessionCount || (searchParams?.stage === "ongoing" ? 1 : 0);
  const nextOrdinal = effectiveCount + 1; // 다음은 N+1회차

  // 히어로 상태 배지
  const status = ongoing ? "코칭 진행중" : done ? "첫 세션 준비 중" : "시작 준비";

  // ── 다음 세션 날짜 ── 마스터 `다음 세션` 우선, 없으면 Clerk 폴백. 미정이면 null → "일정 조율 중".
  const meta = user?.publicMetadata || {};
  const nextSessionAt =
    athlete?.nextSession || (ongoing ? null : meta.firstSessionAt) ||
    (searchParams?.stage === "done" ? "2026-08-09" : null); // 미리보기 기본값(첫세션)
  const programWeeks = meta.programWeeks || ((searchParams?.stage === "done" || searchParams?.stage === "ongoing") ? 8 : null);

  // 리포트 공개 — 마스터 `공개 리포트`(slug 목록)가 진실. 없으면 Clerk publicMetadata 폴백.
  // 미리보기(코치)에서도 lookupEmail로 조회한 선수 기준으로 뜬다. ?report=open 은 전체 미리보기용.
  const assets = resolveAssets({ name: clientName, email: lookupEmail, reportUrl: meta.reportUrl, guideUrl: meta.guideUrl, dataUrl: meta.dataUrl });
  const pub = athlete
    ? new Set(athlete.publishedReports || [])
    : publishedReportSet(meta, assets.reports[0]?.slug || "");
  const openReports = searchParams?.report === "open" ? assets.reports : assets.reports.filter((r) => pub.has(r.slug));
  const reportOpen = openReports.length > 0;

  // D-day (UTC 기준, 표시용). 미정이면 null
  const dday = (() => {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(nextSessionAt || "");
    if (!m) return null;
    const target = Date.UTC(+m[1], +m[2] - 1, +m[3]);
    const n = new Date();
    const today = Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate());
    return Math.round((target - today) / 86400000);
  })();

  // 세션 KPI — ongoing이면 "다음 세션", 아니면 "첫 코칭 세션". 날짜 미정이면 "조율 중".
  const sessionKpiLabel = ongoing ? "다음 세션" : "첫 코칭 세션";
  const sessionKpi =
    dday === null ? { v: "조율 중", u: "", k: sessionKpiLabel }
    : dday > 0 ? { v: String(dday), u: "일 뒤", k: sessionKpiLabel }
    : dday === 0 ? { v: "오늘", u: "", k: sessionKpiLabel }
    : { v: "진행 중", u: "", k: sessionKpiLabel };

  const kpis = ongoing
    ? [
        sessionKpi,
        { v: String(effectiveCount), u: "회", k: "진행한 세션" },
        programWeeks ? { v: String(programWeeks), u: "주", k: "코칭 프로그램" } : { v: "미정", u: "", k: "코칭 프로그램" },
      ]
    : [
        sessionKpi,
        { v: "68", u: "문항", k: "진단 완료" },
        programWeeks ? { v: String(programWeeks), u: "주", k: "코칭 프로그램" } : { v: "미정", u: "", k: "코칭 프로그램" },
      ];

  // 세션 일정 라벨 (여정 타임라인용). 날짜 있으면 날짜에서, 없으면 "일정 조율 중".
  const DOW = ["일", "월", "화", "수", "목", "금", "토"];
  const dateLabel = (iso) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || "");
    if (!m) return null;
    const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
    return `${+m[2]}월 ${+m[3]}일(${DOW[d.getUTCDay()]}) · 오전 10시`;
  };
  const sessionLabel = dateLabel(nextSessionAt) || (ongoing ? "" : meta.sessionLabel) || "일정 조율 중";

  // ── 진행중(ongoing) 전용 여정 — N회차/다음세션 미정까지 반영 ──
  const JOURNEY_ONGOING = [
    { cls: "", stage: "완료", tt: "사전 질문지 완료", td: "68문항으로 수면 상태를 네 영역으로 진단했어요." },
    { cls: "", stage: `${effectiveCount}회 진행`, tt: "코칭 세션을 이어오고 있어요", td: "지금까지 코치와 함께 리포트를 보고 방향을 잡아왔어요." },
    { cls: "now", stage: sessionLabel, tt: `다음 세션 · ${nextOrdinal}회차`,
      td: dateLabel(nextSessionAt) ? "지난 기록을 리뷰하고 다음 목표를 함께 잡아요." : "다음 세션 일정은 코치와 조율 중이에요. 정해지면 여기에 표시돼요." },
    { cls: "goal", stage: "다음 · 최종 목표", tt: "흔들리지 않는 나만의 회복 루틴", td: "세션마다 목표를 함께 다듬어가요." },
  ];

  const BASE_JOURNEY = ongoing ? JOURNEY_ONGOING : done ? JOURNEY_DONE : JOURNEY_PRE;
  // 여정의 '첫 코칭 세션' 항목 날짜를 선수별 실제 일정으로 치환 (pre/done 경로용)
  const journey = BASE_JOURNEY.map((it) => (it.tt && it.tt.includes("코칭 세션") && !ongoing ? { ...it, stage: sessionLabel } : it));

  return (
    <div className="noct-hub">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="wrap">

        {/* Hero */}
        <div className="hero">
          <div className="hero-top">
            <img src="/noct-logo.png" className="logo" alt="NOCT RESEARCH" />
            <LogoutButton />
          </div>
          <h1 className="hero-name">{clientName} <span>{CLIENT.role}</span></h1>
          <div className="hero-coach">{CLIENT.program}</div>
          <div className="hero-status"><span className="status"><span className="dot" />{status}</span></div>
          {(done || ongoing) ? (
            <div className="kpis">
              {kpis.map((kpi) => (
                <div className="kpi" key={kpi.k}>
                  <span className="kv">{kpi.v}{kpi.u && <i>{kpi.u}</i>}</span>
                  <span className="kk">{kpi.k}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="hero-note">
              <ChartIcon />
              <span>사전 질문지를 작성하면 수면 지표가 업데이트 됩니다</span>
            </div>
          )}
        </div>

        {/* intake 미완료면: 작성 CTA */}
        {!done && (
          <a className="cta" href="/athlete">
            <div className="cta-ic"><ClipboardIcon /></div>
            <div>
              <div className="cta-t">사전 수면 질문지 작성하기</div>
              <div className="cta-d">68문항 · 약 15분 · 지금 수면 상태를 진단해요.</div>
            </div>
            <div className="cta-go"><ArrowIcon /></div>
          </a>
        )}

        {/* intake 완료 후: 코칭 준비 자료 CTA (상시 — 언제든 추가 업로드 가능) */}
        {done && (
          <a className="cta" href="/prep">
            <div className="cta-ic"><ClipboardIcon /></div>
            <div>
              <div className="cta-t">코칭 준비 자료 올리기</div>
              <div className="cta-d">경기·원정·비행·훈련 일정을 언제든 올릴 수 있어요.</div>
            </div>
            <div className="cta-go"><ArrowIcon /></div>
          </a>
        )}

        {/* Journey */}
        <section className="journey">
          <div className="sec-label">Progress</div>
          <div className="sec-title">나의 수면 여정</div>
          <div className="tl">
            {journey.map((it, i) => (
              <div className={`tli ${it.cls}`} key={i}>
                <div className="stage">{it.stage}</div>
                <div className="tt">{it.tt}</div>
                <div className="td">{it.td}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Report Archive — 리포트 아카이브 (지수님 허브 미러) */}
        <section className="archive">
          <div className="arc-head">
            <div>
              <div className="sec-label">Report Archive</div>
              <div className="sec-title">리포트 아카이브</div>
            </div>
            <span className="count">{openReports.length > 0 ? `총 ${openReports.length}건 · 최신순` : "리포트 준비 중"}</span>
          </div>
          <div className="alist">
            {/* 공개된 리포트 — 최신순 */}
            {[...openReports].reverse().map((r) => (
              <a className="acard" key={r.slug} href={r.url} target="_blank" rel="noopener noreferrer">
                <div className="adate">
                  <span className="am">{r.date || "리포트"}</span>
                  {r.badge && <span className="ad">{r.badge}</span>}
                </div>
                <div className="abody">
                  <h3>{r.label}</h3>
                  {r.chips && r.chips.length > 0 && (
                    <div className="ameta">{r.chips.map((c, i) => <span className="achip" key={i}>{c}</span>)}</div>
                  )}
                  <p>{r.desc || "코치가 공개한 리포트예요. 눌러서 확인해보세요."}</p>
                  <span className="mcta">리포트 열기<span>→</span></span>
                </div>
                <div className="ago"><ArrowIcon /></div>
              </a>
            ))}
            {/* 예정 카드 — 다음 리포트 자리 */}
            <div className="acard soon">
              <div className="adate"><span className="am">예정</span><span className="ad">NEXT</span></div>
              <div className="abody">
                <h3>다음 점검 리포트</h3>
                <p>{openReports.length > 0
                  ? "다음 세션 이후 점검 리포트가 여기에 차곡차곡 쌓여요."
                  : "첫 리포트가 준비되면 여기에 열려요. 세션 후 코치가 공개해드려요."}</p>
              </div>
              <div className="ago">·</div>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
