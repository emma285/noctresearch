// app/me/page.js — 내정보 탭. 프로필 + 로그아웃. (디자인 시스템 v2)
import { currentUser } from "@clerk/nextjs/server";
import AppShell, { AppBody } from "../../components/app/AppShell";
import { Surface, Row, SectionHeader } from "../../components/app/primitives";
import LogoutAction from "../../components/app/LogoutAction";

export const metadata = { title: "내 정보 | NOCT" };

export default async function MePage() {
  const user = await currentUser();
  const name = user?.unsafeMetadata?.name || user?.firstName || user?.emailAddresses?.[0]?.emailAddress?.split("@")[0] || "선수";
  const email = user?.emailAddresses?.[0]?.emailAddress || "";

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

        <SectionHeader title="계정" />
        <Surface>
          <LogoutAction />
        </Surface>
      </AppBody>
    </AppShell>
  );
}
