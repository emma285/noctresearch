// app/api/submit/route.js
// 사전 설문 제출 → Clerk "질문지 완료" 표시 + 마스터 상태 승격 + 1차 세션 열기 + 답변 Neon 저장.
// (예전 Notion 저장·자동 분석 페이지와 Slack 알림은 제거 — 둘 다 미사용)
import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { getAthleteByEmail, updateMasterFields, createSession, saveIntakeResponse } from "../../../lib/master";

// ─── API Handler ───
export async function POST(request) {
  try {
    const data = await request.json();

    // 로그인 상태로 제출하면 Clerk에 "질문지 완료" 표시 → 포털이 전/후 상태 전환
    try {
      const { userId } = auth();
      if (userId) {
        const cc = typeof clerkClient === "function" ? await clerkClient() : clerkClient;
        await cc.users.updateUserMetadata(userId, {
          publicMetadata: { intakeDone: true, intakeAt: new Date().toISOString() },
        });
        try {
          const u = await cc.users.getUser(userId);
          const email = u?.emailAddresses?.[0]?.emailAddress || "";
          // 마스터 상태 자동 승격: 아직 초기(초대됨/로그인/빈값)면 intake제출로. 이미 진행중/종료면 건드리지 않음.
          try {
            const a = email ? await getAthleteByEmail(email) : null;
            if (a?.pageId) {
              if (["", "초대됨", "로그인"].includes(a.status || "")) {
                await updateMasterFields(a.pageId, { status: "intake제출" });
              }
              await createSession(a.pageId, { n: 1 }); // intake 제출 → 1차 세션 열림 (idempotent)
              await saveIntakeResponse(a.pageId, data.formType, data); // 답변 Neon 저장
            }
          } catch (e) { console.error("master status advance failed:", e?.message); }
        } catch (e) {
          console.error("intake master update failed:", e?.message);
        }
      }
    } catch (e) {
      console.error("clerk metadata update failed:", e?.message);
    }

    revalidateTag("athlete-data"); // 설문 제출 → 마스터 상태/relation 변경 → 캐시 무효화
    return NextResponse.json({ success: true, message: "저장 완료" });
  } catch (error) {
    console.error("intake submit failed:", error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
