// app/api/whoop/callback/route.js
// WHOOP 동의 후 돌아오는 곳: state 검증 → code→token 교환 → 암호화 저장 → 과거 30일 백필 → /whoop.
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getCurrentUser } from "../../../../lib/whoop/session";
import { verifyOAuthState, STATE_COOKIE } from "../../../../lib/whoop/crypto";
import { exchangeCode, whoopGet } from "../../../../lib/whoop/api";
import { saveConnection, backfill, findOtherActiveEmail } from "../../../../lib/whoop/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// a***@gmail.com 형태로 가림
function maskEmail(email) {
  const [local, domain] = String(email).split("@");
  return `${local.slice(0, 1)}***@${domain || ""}`;
}

// 결과는 주소(?whoop=)와 2분짜리 쿠키 두 곳에 실어 보냄.
// WHOOP에서 돌아올 때 Clerk 로그인 재확인(handshake)을 거치며 주소 끝이 떨어질 수 있어서, 쿠키가 예비.
const NOTICE_COOKIE = "whoop_notice"; // app/whoop/page.js 에서 읽음

function back(request, result, extra = {}) {
  const url = new URL("/whoop", request.url);
  url.searchParams.set("whoop", result);
  for (const [k, v] of Object.entries(extra)) url.searchParams.set(k, v);
  const res = NextResponse.redirect(url);
  res.cookies.set(STATE_COOKIE, "", { path: "/api/whoop", maxAge: 0 });
  res.cookies.set(NOTICE_COOKIE, new URLSearchParams({ whoop: result, ...extra }).toString(), {
    path: "/whoop", maxAge: 120, sameSite: "lax", secure: process.env.NODE_ENV === "production",
  });
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

    // 같은 WHOOP 계정이 다른 앱 계정에 연결돼 있으면 저장하지 않고 안내.
    // 방금 받은 토큰은 버리기만 함 — WHOOP 권한 취소(revoke)를 부르면 기존 계정 연결까지 끊길 수 있음.
    const otherEmail = await findOtherActiveEmail(profile?.user_id, user.email);
    if (otherEmail) {
      console.log("whoop callback: already linked to another account", user.email);
      return back(request, "already_linked", { hint: maskEmail(otherEmail) });
    }

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
