// components/consent/HealthConsentNotice.jsx — 건강 정보 별도 동의 고지 내용 (가입 화면 "보기" · 기존 가입자 팝업 공용).
// 개인정보 보호법상 별도 동의 고지 4가지: 항목 · 목적 · 보유 기간 · 거부 권리와 불이익. 색은 부모에서 상속.
const ROWS = [
  ["수집 항목", "진단받은 질환, 복용 중인 약물·영양제, 수면 관련 증상, 수면 검사·부상 이력, 스트레스·기분·우울·불안 관련 응답, 수면·루틴 기록, 코칭 세션 녹음·노트"],
  ["이용 목적", "수면 상태 분석과 맞춤 수면 코칭 제공"],
  ["보관 기간", "회원 탈퇴 시까지"],
  ["동의 거부", "동의하지 않을 수 있어요. 다만 건강 정보 없이는 수면 코칭을 진행할 수 없어 서비스를 이용할 수 없어요."],
];

export default function HealthConsentNotice() {
  return (
    <div className="text-[13px] leading-relaxed">
      <dl className="flex flex-col gap-2.5">
        {ROWS.map(([k, v]) => (
          <div key={k}>
            <dt className="font-semibold">{k}</dt>
            <dd className="opacity-75 mt-0.5">{v}</dd>
          </div>
        ))}
      </dl>
      <p className="opacity-75 mt-3">
        만 14세 미만 자녀의 정보를 입력하는 경우, 법정대리인으로서 동의하는 것으로 봐요.
        자세한 내용은 <a href="/privacy" target="_blank" className="underline underline-offset-2">개인정보처리방침</a>에서 볼 수 있어요.
      </p>
    </div>
  );
}
