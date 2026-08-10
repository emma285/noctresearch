// Clerk v5 미들웨어 — /portal(선수), /coach(코치)만 로그인 보호. 공개 라우트(/ , /athlete, /upload, api/*)는 통과.
// (코치 권한 = 이메일 화이트리스트는 /coach 페이지·API 안에서 별도 확인)
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// 로그인 필요한 경로 (선수 개인 포털 + 코치 배정 페이지 + 리포트 열람)
const isProtectedRoute = createRouteMatcher(["/portal(.*)", "/coach(.*)", "/prep(.*)", "/report/view(.*)", "/me(.*)", "/log(.*)", "/reports(.*)", "/session(.*)"]);

export default clerkMiddleware((auth, req) => {
  if (isProtectedRoute(req)) {
    const { userId } = auth();
    // 미인증이면 호스팅(accounts.dev) 대신 우리 도메인 /sign-in 으로 (홈 화면 아이콘·브랜드 유지)
    if (!userId) {
      const url = new URL("/sign-in", req.url);
      url.searchParams.set("redirect_url", req.nextUrl.pathname + req.nextUrl.search);
      return NextResponse.redirect(url);
    }
  }
});

export const config = {
  matcher: [
    // Next 내부·정적 파일 제외한 모든 경로에서 실행
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
