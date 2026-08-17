// 코치 · (구) 선수 상세 허브 — 이제 canonical 상세 `/coach/clients/[pageId]`로 통합.
// 이 라우트는 Clerk uid 기반 예전 링크(북마크·슬랙)를 위해 리다이렉트만 남긴다.
import { currentUser, clerkClient } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { isCoachEmail } from "../../../../lib/coach";
import { getAthleteByEmail } from "../../../../lib/master";

async function getClerk() {
  return typeof clerkClient === "function" ? await clerkClient() : clerkClient;
}

function Notice({ children }) {
  return (
    <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Pretendard',sans-serif", color: "#111", background: "#F2F3F6", padding: 24 }}>
      <div style={{ maxWidth: 420, textAlign: "center", fontSize: 15, lineHeight: 1.6 }}>{children}</div>
    </main>
  );
}

export default async function AthleteDetailRedirect({ params }) {
  const me = await currentUser();
  if (!isCoachEmail(me?.emailAddresses?.[0]?.emailAddress)) return <Notice>이 페이지는 코치만 볼 수 있어요.</Notice>;

  const uid = params?.uid;
  if (!uid) return <Notice>선수가 지정되지 않았어요.</Notice>;

  let email = "";
  try {
    const cc = await getClerk();
    const u = await cc.users.getUser(uid);
    email = u?.emailAddresses?.[0]?.emailAddress || "";
  } catch {
    return <Notice>선수를 찾을 수 없어요. (uid: {uid})</Notice>;
  }

  const master = email ? await getAthleteByEmail(email) : null;
  if (!master?.pageId) return <Notice>이 선수는 아직 마스터 DB에 연결되지 않았어요.</Notice>;

  redirect(`/coach/clients/${master.pageId}`);
}
