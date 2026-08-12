// app/schedule/page.js — 선수 일정(캘린더). 홈 "전체 일정"에서 진입. 코치 일정 읽기 + 내 일정 편집.
import { currentUser } from "@clerk/nextjs/server";
import { getAthleteByEmail } from "../../lib/master";
import { getAthleteEvents } from "../../lib/calendar";
import { kstToday } from "../../lib/log";
import ScheduleView from "../../components/app/ScheduleView";

export const metadata = { title: "일정 | NOCT" };
export const dynamic = "force-dynamic";

export default async function SchedulePage() {
  const user = await currentUser();
  const email = user?.emailAddresses?.[0]?.emailAddress || "";
  const athlete = email ? await getAthleteByEmail(email) : null;
  if (!athlete?.pageId) {
    return <div className="min-h-[100dvh] bg-background flex items-center justify-center p-10 text-center text-sm text-muted-foreground">일정을 준비 중이에요.</div>;
  }
  const events = await getAthleteEvents(athlete.pageId, { forAthlete: true });
  return <ScheduleView events={events} myPageId={athlete.pageId} today={kstToday()} />;
}
