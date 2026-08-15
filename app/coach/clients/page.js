// app/coach/clients — 코치 선수 목록은 /portal(코치 대시보드)로 통일. 여긴 리다이렉트만 유지(북마크·구링크 호환).
import { redirect } from "next/navigation";
export const dynamic = "force-dynamic";
export default function CoachClientsRedirect() {
  redirect("/portal");
}
