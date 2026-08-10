// app/coach/clients/page.js — 코치 콘솔 v2 · 선수 목록. 코치 전용. (별도 콘솔, 4탭 없음)
import { currentUser } from "@clerk/nextjs/server";
import { isCoachEmail } from "../../../lib/coach";
import { getAllAthletes } from "../../../lib/master";
import { Surface, Row, StatusBadge } from "../../../components/app/primitives";

export const metadata = { title: "코치 콘솔 | NOCT" };
export const dynamic = "force-dynamic";

export default async function CoachClientsPage() {
  const user = await currentUser();
  if (!isCoachEmail(user?.emailAddresses?.[0]?.emailAddress)) {
    return <div className="p-10 text-center text-sm text-muted-foreground">코치 전용 페이지예요.</div>;
  }
  const athletes = await getAllAthletes();

  return (
    <div className="min-h-[100dvh] bg-background mx-auto w-full max-w-[560px]">
      <div className="px-5 pt-[calc(env(safe-area-inset-top)+28px)] pb-1">
        <h1 className="text-[26px] font-bold tracking-[-0.5px] text-foreground">코치 콘솔</h1>
        <p className="text-sm text-muted-foreground mt-1.5">선수 {athletes.length}명</p>
      </div>
      <div className="px-5 py-4">
        {athletes.length === 0 ? (
          <div className="text-center text-muted-foreground text-sm py-16">아직 등록된 선수가 없어요.</div>
        ) : (
          <Surface>
            {athletes.map((a) => (
              <Row
                key={a.pageId}
                title={a.name || a.email}
                desc={[a.sport, a.tier].filter(Boolean).join(" · ") || a.email}
                href={`/coach/clients/${encodeURIComponent(a.email)}`}
                right={<StatusBadge tone={a.status === "진행중" ? "primary" : "plain"}>{a.status || "-"}</StatusBadge>}
              />
            ))}
          </Surface>
        )}
      </div>
    </div>
  );
}
