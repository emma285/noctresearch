// app/uikit/page.js — 실제 앱 라우트를 폰 프레임(390×812)에 iframe으로 넣는 프리뷰 갤러리.
// 데스크탑에서도 모바일 비율로 확인용. (로그인된 세션의 쿠키가 iframe에 실려 인증 페이지도 렌더)
export const metadata = { title: "모바일 프리뷰 | NOCT" };

const FRAMES = [
  { label: "루틴 기록", src: "/log/routine" },
  { label: "수면 기록", src: "/log/sleep" },
  { label: "기록 홈", src: "/log" },
  { label: "리포트", src: "/reports" },
  { label: "홈(포털)", src: "/portal" },
  { label: "내정보", src: "/me" },
];

export default function UIPreview() {
  return (
    <div className="min-h-screen bg-[#e9ebf0] py-10 px-6">
      <div className="max-w-[1280px] mx-auto">
        <div className="text-center text-[15px] font-semibold text-[#0D1B2A] mb-8">모바일 프리뷰 · 390 × 812</div>
        <div className="flex flex-wrap gap-8 justify-center">
          {FRAMES.map((f) => (
            <div key={f.src}>
              <div className="text-center text-[13px] font-semibold text-[#0D1B2A] mb-2.5">{f.label}</div>
              <div className="w-[390px] h-[812px] rounded-[28px] overflow-hidden border border-black/10 shadow-[0_24px_64px_rgba(13,27,42,.18)] bg-white">
                <iframe src={f.src} title={f.label} className="w-full h-full border-0" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
