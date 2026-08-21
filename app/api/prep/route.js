// app/api/prep/route.js
// 코칭 준비 자료(경기·원정/비행·훈련·메모 + 첨부) 제출 → Neon(attachments) 저장 + 코치 슬랙 알림.
// 코치 앱 선수 상세에서 그대로 조회(예전 Notion 저장은 제거 — 노션 DB 미사용).
import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { notifyCoaching } from "../../../lib/notify";
import { saveAttachment } from "../../../lib/attachments";

async function getClerk() {
  return typeof clerkClient === "function" ? await clerkClient() : clerkClient;
}

async function notifyCoachSlack(name, email, items, files, origin, userId) {
  const text = [
    `*코칭 준비 자료 도착* — ${name}${email ? ` (${email})` : ""}`,
    ...items.map((it) => `• [${it.type}] ${it.text}`),
    ...files.map((f) => `첨부 · ${f.name}: ${origin}/api/coach/file?u=${encodeURIComponent(f.url)}`),
    userId ? `배정: ${origin}/coach/assign?uid=${userId}` : "",
  ].filter(Boolean).join("\n");
  await notifyCoaching(text);
}

export async function POST(request) {
  try {
    const { items = [], files = [] } = await request.json();
    if (!items.length && !files.length) {
      return NextResponse.json({ success: false, message: "추가한 내용이 없어요." }, { status: 400 });
    }
    const origin = new URL(request.url).origin;

    const { userId } = auth();
    let name = "선수", email = "";
    if (userId) {
      try {
        const cc = await getClerk();
        const u = await cc.users.getUser(userId);
        name = u?.unsafeMetadata?.name || u?.firstName || u?.username || "선수";
        email = u?.emailAddresses?.[0]?.emailAddress || "";
        await cc.users.updateUserMetadata(userId, {
          publicMetadata: { prepDone: true, prepAt: new Date().toISOString() },
        });
      } catch (e) { console.error("clerk lookup failed:", e?.message); }
    }

    // Neon 저장 (코치 앱 선수 상세에서 조회) — files는 원본 blob url 그대로, 다운로드는 /api/coach/file 프록시
    const note = items.map((it) => `[${it.type}] ${it.text}`).join(" · ").slice(0, 500);
    await saveAttachment({ email, kind: "prep", note, items, files });

    await notifyCoachSlack(name, email, items, files, origin, userId);
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("prep submit failed:", e?.message);
    return NextResponse.json({ success: false, message: e?.message || "저장 실패" }, { status: 500 });
  }
}
