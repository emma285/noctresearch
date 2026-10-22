// app/me/page.js — 내정보 탭. 프로필 + 로그아웃. (디자인 시스템 v2)
import { currentUser } from "@clerk/nextjs/server";
import AppShell, { AppBody } from "../../components/app/AppShell";
import { Surface, Row, SectionHeader } from "../../components/app/primitives";
import LogoutAction from "../../components/app/LogoutAction";
import WhoopStatusIcon from "../../components/whoop/WhoopStatusIcon";
import { isCoachEmail } from "../../lib/coach";
import { getWhoopStatus } from "../../lib/whoop/read";

const WHOOP_DESC = { active: "연결됨", needs_reauth: "재연결 필요", revoked: "연결 안 됨", none: "연결 안 됨" };

export const metadata = { title: "내 정보 | NOCT" };
export const dynamic = "force-dynamic";

export default async function MePage() {
  const user = await currentUser();
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
          <LogoutAction />
        </Surface>
      </AppBody>
    </AppShell>
  );
}
