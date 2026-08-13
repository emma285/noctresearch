// app/coach/session/[id]/page.js — 코치 세션 작업공간(가이드+노트). 코치 전용.
import { currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { isCoachEmail } from "../../../../lib/coach";
import { getSessionById } from "../../../../lib/master";
import { db, schema } from "../../../../lib/db";
import { getLogTimeline, kstToday } from "../../../../lib/log";
import SessionWorkspace from "../../../../components/coach/SessionWorkspace";

export const metadata = { title: "세션 가이드·노트 | NOCT" };
export const dynamic = "force-dynamic";

function fmtDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d)) return "";
  const DOW = ["일", "월", "화", "수", "목", "금", "토"];
  const k = new Date(d.getTime() + 9 * 3600 * 1000);
  return `${k.getUTCMonth() + 1}/${k.getUTCDate()}(${DOW[k.getUTCDay()]}) ${String(k.getUTCHours()).padStart(2, "0")}:${String(k.getUTCMinutes()).padStart(2, "0")}`;
}

export default async function CoachSessionNotePage({ params }) {
  const user = await currentUser();
  if (!isCoachEmail(user?.emailAddresses?.[0]?.emailAddress)) {
    return <div className="p-10 text-center text-sm text-muted-foreground">코치 전용 페이지예요.</div>;
  }
  const session = await getSessionById(params.id);
  if (!session) {
    return <div className="p-10 text-center text-sm text-muted-foreground">세션을 찾을 수 없어요.</div>;
  }

  // 세션 가이드 타임라인용 — 선수 이메일로 최근 수면·루틴 로드
  let timeline = { cols: [], sleeps: [], routines: [] };
  try {
    const c = (await db.select({ email: schema.clients.email }).from(schema.clients).where(eq(schema.clients.id, session.clientId)).limit(1))[0];
    if (c?.email) timeline = await getLogTimeline(c.email, kstToday(), 5);
  } catch (e) { console.error("timeline load failed:", e?.message); }

  return <SessionWorkspace session={session} timeline={timeline} dateLabel={fmtDate(session.date)} />;
}
