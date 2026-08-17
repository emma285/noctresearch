// app/schedule/page.js — 선수 일정(캘린더). 홈 "전체 일정"에서 진입. 코치 일정 읽기 + 내 일정 편집.
import { currentUser } from "@clerk/nextjs/server";
import { getAthleteByEmail, getAthleteByRef } from "../../lib/master";
import { getAthleteEvents } from "../../lib/calendar";
import { isCoachEmail } from "../../lib/coach";
import { kstToday } from "../../lib/log";
import ScheduleView from "../../components/app/ScheduleView";

export const metadata = { title: "일정 | NOCT" };
export const dynamic = "force-dynamic";

export default async function SchedulePage({ searchParams }) {
  const user = await currentUser();
  const myEmail = user?.emailAddresses?.[0]?.emailAddress || "";
  // 코치가 ?as=<pageId 또는 이메일>로 선수 캘린더 미리보기 (포털과 동일)
  const previewRef = isCoachEmail(myEmail) && searchParams?.as ? String(searchParams.as) : null;
  const athlete = previewRef ? await getAthleteByRef(previewRef) : (myEmail ? await getAthleteByEmail(myEmail) : null);
  if (!athlete?.pageId) {
    return <div className="min-h-[100dvh] bg-background flex items-center justify-center p-10 text-center text-sm text-muted-foreground">일정을 준비 중이에요.{isCoachEmail(myEmail) ? " (코치는 ?as=선수id 로 미리보기)" : ""}</div>;
  }
  // 코치 미리보기는 코치 눈으로(비공개 포함) — 편집은 본인 것만 API에서 막힘
  const events = await getAthleteEvents(athlete.pageId, { forAthlete: !previewRef });
  return <ScheduleView events={events} myPageId={athlete.pageId} today={kstToday()} />;
}
