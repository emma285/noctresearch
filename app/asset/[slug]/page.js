// app/asset/[slug]/page.js — 부가자료 뷰(선수앱). AppShell(하단 탭바) 안에 자료 원본을 iframe으로.
// 원본 HTML = /asset/[slug]/raw (권한 동일 체크). 코치=전부, 선수=노출분만.
import { auth, clerkClient } from "@clerk/nextjs/server";
import AppShell from "../../../components/app/AppShell";
import { isCoachEmail } from "../../../lib/coach";
import { getAthleteByEmail, getExposedAssetSlugs } from "../../../lib/master";

export const dynamic = "force-dynamic";
export const metadata = { title: "자료 | NOCT" };

async function getClerk() {
  return typeof clerkClient === "function" ? await clerkClient() : clerkClient;
}

export default async function AssetPage({ params }) {
  const slug = String(params?.slug || "");
  const valid = /^[a-z0-9-]+$/i.test(slug);

  const { userId } = auth();
  const cc = await getClerk();
  const me = userId ? await cc.users.getUser(userId) : null;
  const email = me?.emailAddresses?.[0]?.emailAddress;

  let allowed = isCoachEmail(email);
  if (!allowed && email && valid) {
    const athlete = await getAthleteByEmail(email);
    const exposed = athlete ? await getExposedAssetSlugs(athlete.pageId) : [];
    allowed = exposed.includes(slug);
  }

  if (!valid || !allowed) {
    return (
      <AppShell>
        <div className="px-5 py-24 text-center text-[14px] text-muted-foreground">아직 볼 수 없는 자료예요.</div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <iframe
        src={`/asset/${slug}/raw?embed=1`}
        title="자료"
        style={{ width: "100%", height: "calc(100dvh - 72px - env(safe-area-inset-bottom))", border: 0, display: "block", background: "#F4F6F8" }}
      />
    </AppShell>
  );
}
