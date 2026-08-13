// app/log/sleep/page.js — 수면 기록 위저드 (인증형, 이메일 키). 미들웨어 /log 보호.
import { currentUser } from "@clerk/nextjs/server";
import SleepWizard from "../../../components/app/SleepWizard";

export const metadata = { title: "수면 기록 | NOCT" };

export default async function SleepLogPage({ searchParams }) {
  const user = await currentUser();
  const email = user?.emailAddresses?.[0]?.emailAddress || "";
  const date = /^\d{4}-\d{2}-\d{2}$/.test(searchParams?.date || "") ? searchParams.date : null;
  return <SleepWizard email={email} date={date} />;
}
