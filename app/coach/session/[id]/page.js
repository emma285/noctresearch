// app/coach/session/[id]/page.js — 코치 세션노트 작성 화면. 코치 전용.
import { currentUser } from "@clerk/nextjs/server";
import { isCoachEmail } from "../../../../lib/coach";
import { getSessionById } from "../../../../lib/master";
import SessionNoteForm from "../../../../components/coach/SessionNoteForm";

export const metadata = { title: "세션노트 작성 | NOCT" };
export const dynamic = "force-dynamic";

export default async function CoachSessionNotePage({ params }) {
  const user = await currentUser();
  if (!isCoachEmail(user?.emailAddresses?.[0]?.emailAddress)) {
    return <div className="p-10 text-center text-sm text-muted-foreground">코치 전용 페이지예요.</div>;
  }
  const session = await getSessionById(params.id);
  if (!session) {
    return <div className="p-10 text-center text-sm text-muted-foreground">세션을 찾을 수 없어요.</div>;
  }
  return <SessionNoteForm session={session} />;
}
