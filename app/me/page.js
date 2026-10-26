// app/me/page.js — 내정보 탭. 프로필 + 로그아웃. (디자인 시스템 v2)
import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import AppShell, { AppBody } from "../../components/app/AppShell";
import { Surface, Row, SectionHeader } from "../../components/app/primitives";
import LogoutAction from "../../components/app/LogoutAction";
import DeleteAccountAction from "../../components/app/DeleteAccountAction";
import WhoopStatusIcon from "../../components/whoop/WhoopStatusIcon";
import { ShieldCheck } from "lucide-react";
import { isCoachEmail } from "../../lib/coach";
import { getWhoopStatus } from "../../lib/whoop/read";

const WHOOP_DESC = { active: "연결됨", needs_reauth: "재연결 필요", revoked: "연결 안 됨", none: "연결 안 됨" };

export const metadata = { title: "내 정보 | NOCT" };
export const dynamic = "force-dynamic";

export default async function MePage() {
  // 탈퇴 직후 로그아웃 중 재렌더 시 Clerk 유저가 이미 없음(Not Found) → 에러 대신 로그인으로
  const user = await currentUser().catch(() => null);
  if (!user) redirect("/sign-in");
  const name = user?.unsafeMetadata?.name || user?.firstName || user?.emailAddresses?.[0]?.emailAddress?.split("@")[0] || "선수";
  const email = user?.emailAddresses?.[0]?.emailAddress || "";
  // 기기 연동(WHOOP)은 선수만. 코치 계정엔 안 보임.
  const whoop = email && !isCoachEmail(email) ? await getWhoopStatus(email) : null;

  return (
    <AppShell>
      <div className="px-5 pt-[calc(env(safe-area-inset-top)+28px)] pb-2">
        <h1 className="text-[26px] font-bold tracking-[-0.5px] text-foreground">내 정보</h1>
      </div>
      <AppBody className="pt-4">
        <Surface>
          <Row title="이름" value={name} />
          <Row title="이메일" value={email} />
        </Surface>

        {whoop ? (
          <>
            <SectionHeader title="기기 연동" caption="웨어러블 기록을 자동으로 받아와요." />
            <Surface>
              <Row icon={() => <WhoopStatusIcon status={whoop.status} size={22} fallback />} title="WHOOP" desc={WHOOP_DESC[whoop.status] || "연결 안 됨"} href="/whoop" />
            </Surface>
          </>
        ) : null}

        <SectionHeader title="계정" />
        <Surface>
          <Row icon={ShieldCheck} title="개인정보처리방침" href="/privacy" />
          <LogoutAction />
          {email && !isCoachEmail(email) ? <DeleteAccountAction /> : null}
        </Surface>
      </AppBody>
    </AppShell>
  );
}
