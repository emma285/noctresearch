// app/coach/clients/[email]/logs/page.js — 코치 콘솔 · 선수 기록(수면·루틴) 목록.
// 선수가 남긴 일별 로그를 최신순으로. 각 날짜 → 상세(수면 필드 + 루틴 타임라인).
import { currentUser } from "@clerk/nextjs/server";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Moon, ListChecks } from "lucide-react";
import { isCoachEmail } from "../../../../../lib/coach";
import { getAthleteByEmail } from "../../../../../lib/master";
import { getLogDays } from "../../../../../lib/log";
import { Surface, SectionHeader } from "../../../../../components/app/primitives";

export const metadata = { title: "선수 기록 | NOCT" };
export const dynamic = "force-dynamic";

const DOW = ["일", "월", "화", "수", "목", "금", "토"];
const dLabel = (iso) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || ""); return m ? `${+m[2]}월 ${+m[3]}일 (${DOW[new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])).getUTCDay()]})` : iso; };

// 최근 N개월 키 (YYYY-MM) 내림차순
function recentMonths(n) {
  const now = new Date();
  const out = [];
  for (let i = 0; i < n; i++) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    out.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
  }
  return out;
}

export default async function CoachAthleteLogs({ params }) {
  const email = decodeURIComponent(params.email);
  const user = await currentUser();
  if (!isCoachEmail(user?.emailAddresses?.[0]?.emailAddress)) {
    return <div className="p-10 text-center text-sm text-muted-foreground">코치 전용 페이지예요.</div>;
  }
  const athlete = await getAthleteByEmail(email);

  // 최근 3개월 로그 집계
  let days = {};
  for (const mo of recentMonths(3)) days = { ...days, ...(await getLogDays(email, mo)) };
  const dates = Object.keys(days).filter((d) => days[d].sleep || days[d].routine > 0).sort((a, b) => (a < b ? 1 : -1));

  return (
    <div className="min-h-[100dvh] bg-background mx-auto w-full max-w-[560px]">
      <div className="px-4 pt-[calc(env(safe-area-inset-top)+14px)] pb-2 flex items-center gap-3">
        <Link href={`/coach/clients/${encodeURIComponent(email)}`} className="w-9 h-9 -ml-1.5 rounded-lg flex items-center justify-center active:bg-muted"><ChevronLeft className="w-6 h-6" /></Link>
        <div className="min-w-0">
          <h1 className="text-[20px] font-bold tracking-[-0.3px] leading-tight">{athlete?.name || email} · 기록</h1>
          <div className="text-[13px] text-muted-foreground">수면·루틴 로그 (최근 3개월)</div>
        </div>
      </div>

      <div className="px-5 py-4">
        <SectionHeader title="일별 기록" caption="날짜를 눌러 그날 수면·루틴 상세를 봐요." className="mt-2" />
        {dates.length === 0 ? (
          <div className="text-center text-muted-foreground text-sm py-12">아직 남긴 기록이 없어요.</div>
        ) : (
          <Surface>
            {dates.map((d) => {
              const day = days[d];
              return (
                <Link key={d} href={`/coach/clients/${encodeURIComponent(email)}/logs/${d}`} className="flex items-center gap-3 p-4 first:border-t-0 border-t border-border active:bg-muted/40 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="text-[15px] font-semibold text-foreground">{dLabel(d)}</div>
                    <div className="flex items-center gap-3 mt-1 text-[13px] text-muted-foreground">
                      <span className={`inline-flex items-center gap-1 ${day.sleep ? "text-primary" : ""}`}><Moon className="w-3.5 h-3.5" />{day.sleep ? "수면 기록" : "수면 없음"}</span>
                      <span className={`inline-flex items-center gap-1 ${day.routine > 0 ? "text-primary" : ""}`}><ListChecks className="w-3.5 h-3.5" />루틴 {day.routine}개</span>
                    </div>
                  </div>
                  <ChevronRight className="w-[18px] h-[18px] text-[#B7BDC7] shrink-0" />
                </Link>
              );
            })}
          </Surface>
        )}
      </div>
    </div>
  );
}
