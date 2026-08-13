// app/log/routine/page.js — 루틴 기록(타임라인). 인증형, 이메일 키. 미들웨어 /log 보호.
import { currentUser } from "@clerk/nextjs/server";
import RoutineLog from "../../../components/app/RoutineLog";

export const metadata = { title: "루틴 기록 | NOCT" };

export default async function RoutineLogPage({ searchParams }) {
  const user = await currentUser();
  const email = user?.emailAddresses?.[0]?.emailAddress || "";
  const date = /^\d{4}-\d{2}-\d{2}$/.test(searchParams?.date || "") ? searchParams.date : null;
  return <RoutineLog email={email} date={date} />;
}
