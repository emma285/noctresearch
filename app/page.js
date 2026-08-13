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

  // 미인증이면 포털로 → 미들웨어 보호로 /sign-in 유도.
  if (!email) redirect("/portal");

  // 코치는 항상 포털(대시보드).
  if (isCoachEmail(email)) redirect("/portal");

  // 인테이크 제출 여부 — 마스터 상태·인테이크 relation·Clerk 메타 중 하나라도 양성이면 완료.
  const athlete = await getAthleteByEmail(email).catch(() => null);
  const meta = user?.publicMetadata || {};
  const masterDone = athlete?.status ? MASTER_DONE_STATES.includes(athlete.status) : false;
  const intakeDone = !!(masterDone || athlete?.relations?.intake?.length || meta.intakeDone === true);

  redirect(intakeDone ? "/log" : "/portal");
}
