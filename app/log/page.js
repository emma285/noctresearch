// app/log/page.js — 기록 탭 홈 (첫 세션 후 앱 랜딩). Daily Log 2액션 + 주간 streak.
// 데이터=수면/루틴 로그(계정=이메일). 인증형(미들웨어 /log 보호). 정적 yuna.html과는 별개 경로.
// "오늘"은 클라이언트(LogHomeBody)가 기기 로컬로 계산 → 해외에서도 현지 오늘 기준.
import { currentUser } from "@clerk/nextjs/server";
import LogHomeBody from "../../components/app/LogHomeBody";
import { getLogDays, kstToday } from "../../lib/log";

export const metadata = { title: "기록 | NOCT" };
export const dynamic = "force-dynamic";

// KST 월 오프셋 → "YYYY-MM"
function kstMonth(offset = 0) {
  const t = kstToday();
  const [y, m] = t.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + offset, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export default async function LogHomePage() {
  const user = await currentUser();
  const email = user?.emailAddresses?.[0]?.emailAddress || "";

  // 기기 로컬 오늘이 KST와 최대 ±1일 차이 → 전/현/다음 달을 다 조회해 주간·최근을 안전하게 커버.
  const months = Array.from(new Set([kstMonth(-1), kstMonth(0), kstMonth(1)]));
  let days = {};
  for (const mo of months) days = { ...days, ...(await getLogDays(email, mo)) };

  return <LogHomeBody days={days} serverToday={kstToday()} />;
}
