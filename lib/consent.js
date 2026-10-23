// 건강 정보(민감정보) 별도 동의 여부 — 서버(Clerk User)·클라이언트(useUser) 공용.
// 신규 가입: 가입 화면 체크 → unsafeMetadata.healthConsentAt
// 기존 가입자: 앱 진입 팝업에서 동의 → publicMetadata.healthConsentAt (서버 /api/consent 가 기록)
export function hasHealthConsent(user) {
  return !!(user?.publicMetadata?.healthConsentAt || user?.unsafeMetadata?.healthConsentAt);
}

// WHOOP 기록 저장 동의 (WHOOP API 약관: 데이터 주인의 명시적 승인) — 연결하기 누를 때 받음 → publicMetadata.whoopConsentAt
export function hasWhoopConsent(user) {
  return !!user?.publicMetadata?.whoopConsentAt;
}

// 동의 팝업을 띄우는 선수앱 경로 (코치·공개 화면 제외)
export const CONSENT_GATED_PATHS = ["/portal", "/athlete", "/prep", "/me", "/log", "/reports", "/report/view", "/session", "/schedule", "/asset", "/whoop"];
