// app/coach/clients/[email]/logs/[date]/page.js — 코치 콘솔 · 그날 선수 기록 상세.
// 수면 필드 + 루틴 타임라인. 앱의 /log/day/[date]와 동일 렌더, 코치 스코프(이메일=params).
import { currentUser } from "@clerk/nextjs/server";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { isCoachEmail } from "../../../../../../lib/coach";
import { getAthleteByEmail } from "../../../../../../lib/master";
import { getDayEntries } from "../../../../../../lib/log";
import { TYPES } from "../../../../../../components/app/routineTypes";
import { Surface, Row, SectionHeader } from "../../../../../../components/app/primitives";

export const metadata = { title: "선수 기록 상세 | NOCT" };
export const dynamic = "force-dynamic";

const DOW = ["일", "월", "화", "수", "목", "금", "토"];
const fmtMin = (m) => (typeof m === "number" ? `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}` : m || "-");
const tmin = (t) => { const [h, m] = String(t || "0:0").split(":").map(Number); return h * 60 + m; };

export default async function CoachAthleteDayDetail({ params }) {
  const email = decodeURIComponent(params.email);
  const date = params.date;
  const user = await currentUser();
  if (!isCoachEmail(user?.emailAddresses?.[0]?.emailAddress)) {
    return <div className="p-10 text-center text-sm text-muted-foreground">코치 전용 페이지예요.</div>;
  }
  const athlete = await getAthleteByEmail(email);
  const { sleep, blocks } = await getDayEntries(email, date);

  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(date || "");
  const dateLabel = m ? `${+m[2]}월 ${+m[3]}일 (${DOW[new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])).getUTCDay()]})` : date;

  const s = sleep?.data || null;
  const sleepRows = s
    ? [
        ["취침", fmtMin(s.bed)],
        ["잠들기까지", s.sol],
        ["기상", fmtMin(s.wake)],
        ["침대 밖까지", typeof s.outbed === "number" ? fmtMin(s.outbed) : s.outbed],
        ["밤중 깸", `${s.woke ?? 0}회`],
        ...(s.woke > 0 && s.waso ? [["깨어있던 시간", s.waso]] : []),
      ].filter(([, v]) => v != null && v !== "" && v !== "-")
    : [];
  const sorted = [...blocks].sort((a, b) => tmin(a.time) - tmin(b.time));

  return (
    <div className="min-h-[100dvh] bg-background mx-auto w-full max-w-[560px]">
      <div className="px-4 pt-[calc(env(safe-area-inset-top)+14px)] pb-2 flex items-center gap-3">
        <Link href={`/coach/clients/${encodeURIComponent(email)}/logs`} className="w-9 h-9 -ml-1.5 rounded-lg flex items-center justify-center active:bg-muted"><ChevronLeft className="w-6 h-6" /></Link>
        <div className="min-w-0">
          <h1 className="text-[20px] font-bold tracking-[-0.3px] leading-tight">{dateLabel}</h1>
          <div className="text-[13px] text-muted-foreground truncate">{athlete?.name || email}</div>
        </div>
      </div>

      <div className="px-5 py-4">
        {!sleep && sorted.length === 0 ? (
          <div className="text-center text-muted-foreground text-sm py-16">이 날은 기록이 없어요.</div>
        ) : null}

        {sleep ? (
          <>
            <SectionHeader title="수면 기록" className="mt-2" />
            <Surface>
              {sleepRows.map(([k, v]) => <Row key={k} title={k} value={v} />)}
              {s?.feel?.length ? (
                <div className="p-4 border-t border-border">
                  <div className="text-[13px] text-muted-foreground mb-2.5">컨디션</div>
                  <div className="flex flex-wrap gap-2">
                    {s.feel.map((f) => <span key={f} className="text-[13px] font-medium text-primary bg-primary/10 px-3 py-1.5 rounded-full">{f}</span>)}
                  </div>
                </div>
              ) : null}
              {s?.memo ? (
                <div className="p-4 border-t border-border">
                  <div className="text-[13px] text-muted-foreground mb-1.5">메모</div>
                  <div className="text-[15px] text-foreground whitespace-pre-line leading-relaxed">{s.memo}</div>
                </div>
              ) : null}
            </Surface>
          </>
        ) : null}

        {sorted.length ? (
          <>
            <SectionHeader title="루틴 타임라인" />
            <div className="pt-1">
              {sorted.map((b, i) => {
                const t = TYPES[b.type] || TYPES.etc; const Ic = t.icon;
                const sub = [b.detail, b.dur, b.text].filter(Boolean).join(" · ");
                const isLast = i === sorted.length - 1;
                return (
                  <div key={b.nid} className="flex gap-3">
                    <div className="w-11 shrink-0 text-right text-[13px] font-semibold text-muted-foreground pt-3.5 tabular-nums">{b.time}</div>
                    <div className="relative w-3 shrink-0 flex justify-center">
                      <div className={`absolute w-0.5 bg-border left-1/2 -translate-x-1/2 top-0 ${isLast ? "h-[26px]" : "bottom-0"}`} />
                      <div className="relative z-10 w-3 h-3 rounded-full mt-[15px] ring-4 ring-background" style={{ background: t.color }} />
                    </div>
                    <div className="flex-1 pb-4 min-w-0">
                      <div className="flex items-center gap-3 bg-card border border-border rounded-xl p-3">
                        <span className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: t.bg, color: t.color }}><Ic className="w-[18px] h-[18px]" strokeWidth={2} /></span>
                        <div className="flex-1 min-w-0"><div className="text-[15px] font-semibold text-foreground">{t.label}</div>{sub ? <div className="text-[13px] text-muted-foreground mt-0.5 truncate">{sub}</div> : null}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
