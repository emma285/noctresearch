// 코치 이메일 판별 (여러 라우트에서 공용). 기본값은 미도 코치, 실제 목록은 Vercel 환경변수 COACH_EMAILS.
export const COACH_EMAILS = (process.env.COACH_EMAILS || "hi.mido.kim@gmail.com")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

export function isCoachEmail(email) {
  return !!email && COACH_EMAILS.includes(String(email).toLowerCase());
}
