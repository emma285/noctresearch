import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import { getAthleteByEmail } from "../lib/master";
import { isCoachEmail } from "../lib/coach";

// 진입 라우팅 (로그인-우선).
// - 미인증: /portal 로 → 미들웨어가 /sign-in 으로 튕김.
// - 코치: /portal (코치 대시보드).
// - 인테이크 제출한 선수: /log (기록 홈) 로 바로. ← 접속할 때마다 기록이 먼저 뜨게.
// - 그 외 선수(제출 전): /portal (온보딩 체크리스트).
const MASTER_DONE_STATES = ["intake제출", "온보딩완료", "진행중", "종료"];

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await currentUser();
  const email = user?.emailAddresses?.[0]?.emailAddress;

  // 미인증이면 로그인으로 (redirect_url 없이 → 로그인 후 fallback=/ 로 돌아와 이 스마트 라우팅을 다시 탐).
  if (!email) redirect("/sign-in");

  // 코치는 항상 포털(대시보드).
  if (isCoachEmail(email)) redirect("/portal");

  // 빠른 경로: Clerk 세션 메타에 intakeDone 있으면 DB 조회 없이 바로 /log (흰 화면 단축).
  const meta = user?.publicMetadata || {};
  if (meta.intakeDone === true) redirect("/log");

  // 메타 없으면 마스터 상태로 판단 (Neon 1회 조회).
  const athlete = await getAthleteByEmail(email).catch(() => null);
  const masterDone = athlete?.status ? MASTER_DONE_STATES.includes(athlete.status) : false;
  const intakeDone = !!(masterDone || athlete?.relations?.intake?.length);

  redirect(intakeDone ? "/log" : "/portal");
}
