/* Clerk 에러 코드 → 한글 메시지 매핑 (헤드리스 커스텀 폼용) */

const MAP = {
  form_identifier_not_found: "가입되지 않은 이메일이에요.",
  form_password_incorrect: "비밀번호가 올바르지 않아요.",
  form_identifier_exists: "이미 가입된 이메일이에요. 로그인해 주세요.",
  form_password_length_too_short: "비밀번호는 8자 이상이어야 해요.",
  form_password_pwned: "보안에 취약한 비밀번호예요. 다른 비밀번호를 써주세요.",
  form_param_format_invalid: "입력 형식을 확인해 주세요.",
  form_param_nil: "빈 칸을 채워 주세요.",
  form_code_incorrect: "인증 코드가 올바르지 않아요.",
  verification_failed: "인증에 실패했어요. 다시 시도해 주세요.",
  verification_expired: "인증 시간이 만료됐어요. 코드를 다시 받아 주세요.",
  session_exists: "이미 로그인되어 있어요.",
  identifier_already_signed_in: "이미 로그인되어 있어요.",
  too_many_requests: "잠시 후 다시 시도해 주세요.",
};

export function krError(err, fallback = "문제가 생겼어요. 다시 시도해 주세요.") {
  const e = err?.errors?.[0];
  if (!e) return fallback;
  return MAP[e.code] || e.longMessage || e.message || fallback;
}
