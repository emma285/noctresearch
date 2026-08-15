// app/coach/clients/[email]/page.js — 코치 콘솔 v2 · 선수 상세. 세션 목록 → 노트 편집.
import { currentUser } from "@clerk/nextjs/server";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ClipboardList } from "lucide-react";
import { isCoachEmail } from "../../../../lib/coach";
import { getAthleteByEmail, getSessionsByAthlete } from "../../../../lib/master";
import { Surface, SectionHeader } from "../../../../components/app/primitives";
import CoachManageForm from "../../../../components/coach/CoachManageForm";

export const metadata = { title: "선수 상세 | NOCT" };
export const dynamic = "force-dynamic";
const DOW = ["일", "월", "화", "수", "목", "금", "토"];
const md = (iso) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || ""); return m ? `${+m[2]}월 ${+m[3]}일 (${DOW[new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])).getUTCDay()]})` : ""; };

export default async function CoachClientDetail({ params }) {
  const email = decodeURIComponent(params.email);
  const user = await currentUser();
  if (!isCoachEmail(user?.emailAddresses?.[0]?.emailAddress)) {
    return <div className="p-10 text-center text-sm text-muted-foreground">코치 전용 페이지예요.</div>;
  }
  const athlete = await getAthleteByEmail(email);
  if (!athlete) return <div className="p-10 text-center text-sm text-muted-foreground">선수를 찾을 수 없어요.</div>;
  const sessions = athlete.pageId ? await getSessionsByAthlete(athlete.pageId) : [];

  const meta = [athlete.sport, athlete.tier, athlete.nextSession ? `다음 ${md(athlete.nextSession)}` : "다음 세션 미정"].filter(Boolean).join(" · ");

  return (
    <div className="min-h-[100dvh] bg-background mx-auto w-full max-w-[560px]">
      <div className="px-4 pt-[calc(env(safe-area-inset-top)+14px)] pb-2 flex items-center gap-3">
        <Link href="/portal" className="w-9 h-9 -ml-1.5 rounded-lg flex items-center justify-center active:bg-muted"><ChevronLeft className="w-6 h-6" /></Link>
        <div className="min-w-0">
          <h1 className="text-[20px] font-bold tracking-[-0.3px] leading-tight">{athlete.name || email}</h1>
          <div className="text-[13px] text-muted-foreground truncate">{athlete.status || "-"} · {meta}</div>
        </div>
      </div>

      <div className="px-5 py-4">
        <SectionHeader title="배정 · 상태" caption="여기서 정한 건 선수 화면에 바로 반영돼요." className="mt-2" />
        <CoachManageForm athlete={{ pageId: athlete.pageId, nextSession: athlete.nextSession, status: athlete.status, program: athlete.program }} />

        <SectionHeader title="선수 기록" caption="선수가 남긴 수면·루틴 로그를 확인해요." />
        <Surface>
          <Link href={`/coach/clients/${encodeURIComponent(email)}/logs`} className="flex items-center gap-3 p-4 active:bg-muted/40 transition-colors">
            <span className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0"><ClipboardList className="w-[18px] h-[18px]" /></span>
            <div className="flex-1 min-w-0">
              <div className="text-[15px] font-semibold text-foreground">수면·루틴 기록 보기</div>
              <div className="text-[13px] text-muted-foreground mt-0.5">일별 수면 필드 · 루틴 타임라인</div>
            </div>
            <ChevronRight className="w-[18px] h-[18px] text-[#B7BDC7] shrink-0" />
          </Link>
        </Surface>

        <SectionHeader title="세션 · 코칭 노트" caption="세션을 눌러 코칭 노트를 작성/수정해요." />
        {sessions.length === 0 ? (
          <div className="text-center text-muted-foreground text-sm py-10">아직 세션이 없어요.</div>
        ) : (
          <Surface>
            {sessions.map((s) => (
              <Link key={s.id} href={`/coach/session/${s.id}`} className="flex items-center gap-3 p-4 first:border-t-0 border-t border-border active:bg-muted/40 transition-colors">
                <span className="w-9 h-9 rounded-lg bg-primary/10 text-primary text-[13px] font-bold flex items-center justify-center shrink-0">{s.n ?? "-"}회</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[15px] font-semibold text-foreground">{s.n ? `${s.n}회차 코칭 세션` : (s.title || "코칭 세션")}</div>
                  <div className="text-[13px] text-muted-foreground mt-0.5">{md(s.date) || "날짜 미정"} · 노트 작성/수정</div>
                </div>
                <ChevronRight className="w-[18px] h-[18px] text-[#B7BDC7] shrink-0" />
              </Link>
            ))}
          </Surface>
        )}

        <SectionHeader title="공개 리포트" />
        <Surface>
          {athlete.publishedReports?.length ? (
            athlete.publishedReports.map((slug) => (
              <div key={slug} className="p-4 first:border-t-0 border-t border-border text-[15px] font-medium text-foreground">{slug}</div>
            ))
          ) : (
            <div className="p-4 text-[13px] text-muted-foreground">공개된 리포트가 없어요.</div>
          )}
        </Surface>
        <p className="text-[12px] text-muted-foreground/70 mt-4">리포트 공개 토글은 다음 단계에서 여기 연동돼요.</p>
      </div>
    </div>
  );
}
