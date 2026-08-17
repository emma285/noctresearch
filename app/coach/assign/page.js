// app/coach/assign/page.js
// 코치(Emma) 전용 배정 화면. 슬랙 알림의 링크(/coach/assign?uid=...)로 진입.
// 코치 이메일이 아니면 접근 차단. 선수 정보 + 현재 배정값을 불러와 폼에 채움.
import { currentUser, clerkClient } from "@clerk/nextjs/server";
import AssignForm from "../../../components/coach/AssignForm";

const COACH_EMAILS = (process.env.COACH_EMAILS || "hi.mido.kim@gmail.com")
  .split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);

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

export default async function CoachAssignPage({ searchParams }) {
  const me = await currentUser();
  const myEmail = me?.emailAddresses?.[0]?.emailAddress?.toLowerCase();
  const isCoach = myEmail && COACH_EMAILS.includes(myEmail);
  if (!isCoach) return <Notice>이 페이지는 코치만 볼 수 있어요.</Notice>;

  const uid = searchParams?.uid || "";
  if (!uid) return <Notice>배정할 선수가 지정되지 않았어요. 슬랙 알림의 배정 링크로 열어주세요.</Notice>;

  let target;
  try {
    const cc = await getClerk();
    const u = await cc.users.getUser(uid);
    target = {
      uid,
      name: u?.unsafeMetadata?.name || u?.firstName || u?.username || "",
      email: u?.emailAddresses?.[0]?.emailAddress || "",
      firstSessionAt: u?.publicMetadata?.firstSessionAt || "",
      sessionLabel: u?.publicMetadata?.sessionLabel || "",
      programWeeks: u?.publicMetadata?.programWeeks || "",
      reportUrl: u?.publicMetadata?.reportUrl || "",
      guideUrl: u?.publicMetadata?.guideUrl || "",
      dataUrl: u?.publicMetadata?.dataUrl || "",
    };
  } catch {
    return <Notice>선수를 찾을 수 없어요. (uid: {uid})</Notice>;
  }

  return <AssignForm target={target} />;
}
