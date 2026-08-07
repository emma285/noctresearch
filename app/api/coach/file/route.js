// app/api/coach/file/route.js
// 코치(Emma)만 접근. private Blob 첨부를 서버에서 토큰으로 받아 스트리밍(뷰어).
// 슬랙/Notion의 첨부 링크가 이 라우트를 가리킴 → 코치 로그인 상태에서 열림.
import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const COACH_EMAILS = (process.env.COACH_EMAILS || "hi.mido.kim@gmail.com")
  .split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);

async function getClerk() {
  return typeof clerkClient === "function" ? await clerkClient() : clerkClient;
}

export async function GET(request) {
  try {
    const { userId } = auth();
    if (!userId) return new NextResponse("로그인이 필요해요.", { status: 401 });
    const cc = await getClerk();
    const me = await cc.users.getUser(userId);
    const email = me?.emailAddresses?.[0]?.emailAddress?.toLowerCase();
    if (!email || !COACH_EMAILS.includes(email)) return new NextResponse("코치만 볼 수 있어요.", { status: 403 });

    const u = new URL(request.url).searchParams.get("u");
    if (!u) return new NextResponse("파일 주소가 없어요.", { status: 400 });
    let target;
    try { target = new URL(u); } catch { return new NextResponse("잘못된 주소예요.", { status: 400 }); }
    // SSRF 방지 — 우리 Blob 스토어만 허용
    if (!target.hostname.endsWith(".blob.vercel-storage.com")) {
      return new NextResponse("허용되지 않은 주소예요.", { status: 400 });
    }

    const res = await fetch(target.toString(), {
      headers: { authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` },
    });
    if (!res.ok) return new NextResponse("파일을 불러올 수 없어요.", { status: res.status });

    const headers = new Headers();
    headers.set("Content-Type", res.headers.get("content-type") || "application/octet-stream");
    headers.set("Cache-Control", "private, max-age=60");
    return new NextResponse(res.body, { status: 200, headers });
  } catch (e) {
    return new NextResponse("오류: " + (e?.message || ""), { status: 500 });
  }
}
