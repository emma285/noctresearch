// Clerk v5 미들웨어 — /portal(선수), /coach(코치)만 로그인 보호. 공개 라우트(/ , /athlete, /upload, api/*)는 통과.
// (코치 권한 = 이메일 화이트리스트는 /coach 페이지·API 안에서 별도 확인)
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// 로그인 필요한 경로 (선수 개인 포털 + 코치 배정 페이지)
const isProtectedRoute = createRouteMatcher(["/portal(.*)", "/coach(.*)"]);

export default clerkMiddleware((auth, req) => {
  if (isProtectedRoute(req)) {
    auth().protect(); // 미인증 시 /sign-in 으로 리다이렉트
  }
});

export const config = {
  matcher: [
    // Next 내부·정적 파일 제외한 모든 경로에서 실행
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
