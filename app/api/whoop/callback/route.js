// app/api/whoop/callback/route.js
// WHOOP 동의 후 돌아오는 곳: state 검증 → code→token 교환 → 암호화 저장 → 과거 30일 백필 → /portal.
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getCurrentUser } from "../../../../lib/whoop/session";
import { verifyOAuthState, STATE_COOKIE } from "../../../../lib/whoop/crypto";
import { exchangeCode, whoopGet } from "../../../../lib/whoop/api";
import { saveConnection, backfill } from "../../../../lib/whoop/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function back(request, result) {
  const url = new URL("/portal", request.url);
  url.searchParams.set("whoop", result);
  const res = NextResponse.redirect(url);
  res.cookies.set(STATE_COOKIE, "", { path: "/api/whoop", maxAge: 0 });
  return res;
}

export async function GET(request) {
  const params = new URL(request.url).searchParams;
  if (params.get("error")) return back(request, "denied"); // 선수가 동의 화면에서 거절

  const user = await getCurrentUser().catch(() => null);
  if (!user) return back(request, "login_required");

  const cookieState = cookies().get(STATE_COOKIE)?.value;
  if (!verifyOAuthState(cookieState, params.get("state"), user.userId)) {
    return back(request, "invalid_state");
  }

  const code = params.get("code");
  if (!code) return back(request, "error");

  try {
    const tokens = await exchangeCode(code);
    const profile = await whoopGet("/v2/user/profile/basic", tokens.access_token);
    await saveConnection({ email: user.email, whoopUserId: profile?.user_id ?? null, tokens });

    // 백필 실패해도 연결 자체는 유지 (이후 웹훅/재시도로 채움)
    try {
      const counts = await backfill(user.email, tokens.access_token, 30);
      console.log("whoop backfill:", user.email, counts);
    } catch (e) {
      console.error("whoop backfill failed:", e?.message);
    }
    return back(request, "connected");
  } catch (e) {
    console.error("whoop callback failed:", e?.message);
    return back(request, "error");
  }
}
