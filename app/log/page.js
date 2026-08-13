// app/log/page.js — 기록 탭 홈 (첫 세션 후 앱 랜딩). Daily Log 2액션 + 주간 streak.
// 데이터=수면/루틴 로그(계정=이메일). 인증형(미들웨어 /log 보호). 정적 yuna.html과는 별개 경로.
import { currentUser } from "@clerk/nextjs/server";
import Link from "next/link";
import { ListChecks, Moon, Check } from "lucide-react";
import AppShell, { AppBody } from "../../components/app/AppShell";
import { Surface, SectionHeader, Streak, Row } from "../../components/app/primitives";
import { getLogDays, kstToday } from "../../lib/log";

export const metadata = { title: "기록 | NOCT" };
export const dynamic = "force-dynamic";

const DOW_FULL = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"];

// showDone=완료 배지(수면=1회 개념). routine은 항상 '기록하기'(여러 개 가능).
function RecordRow({ icon: Icon, title, sub, showDone, href }) {
  return (
    <Link href={href} className="flex items-center gap-3 p-4 first:border-t-0 border-t border-border active:bg-muted/40 transition-colors">
      <Icon className="w-[22px] h-[22px] text-primary shrink-0" strokeWidth={2} />
      <div className="flex-1 min-w-0">
        <div className="text-base font-semibold text-foreground tracking-[-0.01em]">{title}</div>
        <div className="text-[13px] text-muted-foreground mt-0.5">{sub}</div>
      </div>
      {showDone ? (
        <span className="flex items-center gap-1.5 text-[13px] font-medium text-foreground shrink-0">
          <span className="w-5 h-5 rounded-full bg-accent flex items-center justify-center">
            <Check className="w-3 h-3 text-navy" strokeWidth={3} />
          </span>
          완료
        </span>
      ) : (
        <span className="text-[13px] font-semibold text-white bg-primary px-[13px] py-[7px] rounded-[10px] shrink-0">기록하기</span>
      )}
    </Link>
  );
}

export default async function LogHomePage() {
  const user = await currentUser();
  const email = user?.emailAddresses?.[0]?.emailAddress || "";

  const todayStr = kstToday();
  const [ty, tm, td] = todayStr.split("-").map(Number);
  const base = new Date(Date.UTC(ty, tm - 1, td));
  const dow = base.getUTCDay();
  const monday = new Date(base.getTime() + (dow === 0 ? -6 : 1 - dow) * 86400000);

  // 이번 주가 두 달에 걸치면 두 달 다 조회
  const months = Array.from(new Set([todayStr.slice(0, 7), monday.toISOString().slice(0, 7)]));
  let days = {};
  for (const mo of months) days = { ...days, ...(await getLogDays(email, mo)) };

  const routineCount = days[todayStr]?.routine || 0;
  const sleepDone = !!days[todayStr]?.sleep;

  const labels = ["월", "화", "수", "목", "금", "토", "일"];
  let weekCount = 0;
  const week = labels.map((label, i) => {
    const d = new Date(monday.getTime() + i * 86400000).toISOString().slice(0, 10);
    const rec = !!days[d] && (days[d].routine > 0 || days[d].sleep) && d <= todayStr;
    if (rec) weekCount += 1;
    return { label, on: rec };
  });

  const dateLabel = `${tm}월 ${td}일 ${DOW_FULL[base.getUTCDay()]}`;

  // 최근 기록 (오늘 이하, 기록 있는 날 최신순 6개)
  const SHORT = ["일", "월", "화", "수", "목", "금", "토"];
  const recent = Object.keys(days)
    .filter((d) => d <= todayStr && (days[d].routine > 0 || days[d].sleep))
    .sort().reverse().slice(0, 6)
    .map((d) => {
      const [Y, M, D] = d.split("-").map(Number);
      const wd = SHORT[new Date(Date.UTC(Y, M - 1, D)).getUTCDay()];
      const parts = [];
      if (days[d].sleep) parts.push("수면");
      if (days[d].routine > 0) parts.push(`루틴 ${days[d].routine}`);
      return { d, label: `${M}월 ${D}일(${wd})`, desc: parts.join(" · ") };
    });

  return (
    <AppShell>
      <div className="px-5 pt-[calc(env(safe-area-inset-top)+28px)] pb-1">
        <h1 className="text-[26px] font-bold tracking-[-0.5px] text-foreground">오늘도 기록해요</h1>
        <p className="text-sm text-muted-foreground mt-1.5">{dateLabel}</p>
      </div>
      <AppBody className="pt-4">
        <Surface>
          <RecordRow icon={ListChecks} title="루틴 기록" sub={routineCount > 0 ? `오늘 ${routineCount}개 기록` : "아직 기록 전이에요"} href="/log/routine" />
          <RecordRow icon={Moon} title="수면 기록" showDone={sleepDone} sub={sleepDone ? "오늘 기록 완료" : "아직 기록 전이에요"} href="/log/sleep" />
        </Surface>

        <SectionHeader title="이번 주 기록" right={`${weekCount}/7일`} />
        <Surface className="p-4">
          <Streak days={week} />
        </Surface>

        <SectionHeader title="최근 기록" />
        <Surface>
          {recent.length ? (
            recent.map((r) => <Row key={r.d} title={r.label} value={r.desc} href={`/log/day/${r.d}`} />)
          ) : (
            <div className="p-4 text-[13px] text-muted-foreground">아직 기록이 없어요. 위에서 오늘 기록을 시작해보세요.</div>
          )}
        </Surface>
      </AppBody>
    </AppShell>
  );
}
