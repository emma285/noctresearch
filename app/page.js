import { redirect } from "next/navigation";

// 진입은 로그인-우선. 루트로 들어오면 포털로 보냄.
// /portal 은 미들웨어 보호 → 미인증이면 자동으로 /sign-in 으로 튕김.
// 로그인 후: /portal(허브) → "사전 수면 질문지 작성하기" CTA → /athlete(최신 설문)
export default function Home() {
  redirect("/portal");
}
