// app/api/whoop/connect/route.js
// "WHOOP 연결하기" 클릭 → state(CSRF + Clerk userId 바인딩) 쿠키 발급 → WHOOP 동의 화면으로 302.
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { newOAuthState, STATE_COOKIE } from "../../../../lib/whoop/crypto";
import { buildAuthorizeUrl } from "../../../../lib/whoop/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  const { userId } = auth();
  if (!userId) {
    const url = new URL("/sign-in", request.url);
    url.searchParams.set("redirect_url", "/api/whoop/connect");
    return NextResponse.redirect(url);
  }

  const { state, cookie } = newOAuthState(userId);
  const res = NextResponse.redirect(buildAuthorizeUrl(state));
  res.cookies.set(STATE_COOKIE, cookie, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",          // WHOOP → callback 리다이렉트(top-level GET)에 쿠키가 실려야 함
    path: "/api/whoop",
    maxAge: 10 * 60,          // 10분 안에 동의 완료
  });
  return res;
}
