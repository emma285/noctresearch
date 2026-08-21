// app/session/[id]/page.js — 코칭 노트(선수 공유용). 코치가 작성·공개한 노트를 표시.
// 홈 '지난 세션' 탭 → 여기로. 인증형(미들웨어 /session 보호).
import { currentUser } from "@clerk/nextjs/server";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import AppShell, { AppBody } from "../../../components/app/AppShell";
import { Surface, SectionHeader } from "../../../components/app/primitives";
import { getSessionById, markSessionSeen } from "../../../lib/master";
import { resolveAssets, extrasBySlugs, reportSlug } from "../../../lib/athleteAssets";
import { db, schema } from "../../../lib/db";
import { eq } from "drizzle-orm";
import { isCoachEmail } from "../../../lib/coach";

export const metadata = { title: "코칭 노트 | NOCT" };
export const dynamic = "force-dynamic"; // 저장 직후 바로 반영 (캐시 방지)
const DOW = ["일", "월", "화", "수", "목", "금", "토"];

export default async function SessionNotePage({ params }) {
  const user = await currentUser();
  const s = await getSessionById(params.id);
  // 선수 본인이 공개된 노트를 열면 '봤음' 기록 → 홈 NEW 해제 (코치 프리뷰는 제외)
  if (s?.published && !isCoachEmail(user?.emailAddresses?.[0]?.emailAddress)) {
    await markSessionSeen(s.id);
  }

  // 이 세션에 첨부된 부가자료(공개된 세션만) → 선수에게 카드로 노출
  let attachExtras = [];
  if (s?.published && s.attachments?.length) {
    try {
      const c = (await db.select({ email: schema.clients.email, name: schema.clients.name }).from(schema.clients).where(eq(schema.clients.id, s.clientId)).limit(1))[0];
      attachExtras = extrasBySlugs(resolveAssets({ name: c?.name, email: c?.email }).extras, s.attachments);
    } catch (e) { console.error("session attachments load failed:", e?.message); }
  }

  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s?.date || "");
  const dateLabel = m ? `${+m[2]}월 ${+m[3]}일 (${DOW[new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])).getUTCDay()]})` : "";
  const title = s?.n ? `${s.n}회차 코칭 세션` : (s?.title || "코칭 세션");

  const hasNote = s?.published && (s.summary || s.actions?.length || s.comment);

  return (
    <AppShell>
      <div className="px-4 pt-[calc(env(safe-area-inset-top)+14px)] pb-2 flex items-center gap-3">
        <Link href="/portal" className="w-9 h-9 -ml-1.5 rounded-lg flex items-center justify-center active:bg-muted"><ChevronLeft className="w-6 h-6" /></Link>
        <div className="min-w-0">
          <h1 className="text-[20px] font-bold tracking-[-0.3px] leading-tight">{title}</h1>
          {dateLabel ? <div className="text-[13px] text-muted-foreground">{dateLabel}</div> : null}
        </div>
      </div>

      <AppBody className="pt-3">
        {!hasNote ? (
          <div className="text-center text-muted-foreground text-sm py-16 leading-relaxed">코치가 세션 후 노트를<br />정리해서 공유할 거예요.</div>
        ) : (
          <>
            {s.summary ? (
              <>
                <SectionHeader title="세션 요약" className="mt-4" />
                <Surface className="p-4"><p className="text-[15px] text-foreground leading-relaxed whitespace-pre-line">{s.summary}</p></Surface>
              </>
            ) : null}

            {s.actions?.length ? (
              <>
                <SectionHeader title="이번 주 함께 해볼 것" />
                <Surface>
                  {s.actions.map((a, i) => (
                    <div key={i} className="flex items-center gap-3 p-4 first:border-t-0 border-t border-border">
                      <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-[13px] font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                      <div className="text-[15px] font-medium text-foreground">{a}</div>
                    </div>
                  ))}
                </Surface>
              </>
            ) : null}

            {s.comment ? (
              <>
                <SectionHeader title="코치가 전하는 말" />
                <Surface className="p-4"><p className="text-[15px] text-foreground leading-relaxed whitespace-pre-line">{s.comment}</p></Surface>
              </>
            ) : null}
          </>
        )}

        {attachExtras.length ? (
          <>
            <SectionHeader title="함께 볼 자료" />
            <Surface>
              {attachExtras.map((e) => (
                <a key={e.url} href={`/asset/${reportSlug(e.url)}`} className="flex items-center gap-3 p-4 first:border-t-0 border-t border-border active:bg-muted/40">
                  <span className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-[18px] shrink-0">📄</span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-[15px] font-bold text-navy truncate">{e.label}</span>
                    {e.desc ? <span className="block text-[12.5px] text-muted-foreground truncate">{e.desc}</span> : null}
                  </span>
                  <span className="text-[13px] font-bold text-primary shrink-0">열기 →</span>
                </a>
              ))}
            </Surface>
          </>
        ) : null}
      </AppBody>
    </AppShell>
  );
}
