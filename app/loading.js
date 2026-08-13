// 루트 브랜드 스플래시 — 루트 리다이렉트·인증·Neon 조회 동안 흰 화면 대신 네이비+로고.
// 탭 라우트(portal·log 등)는 각자 loading.js(스켈레톤)가 있어 이건 루트/인증/온보딩 등에만.
export default function Loading() {
  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "linear-gradient(165deg,#0B1622 0%,#152740 55%,#1d3252 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <img
        src="/noct-logo.png"
        alt="NOCT"
        style={{ height: 26, width: "auto", filter: "brightness(0) invert(1)", opacity: 0.92 }}
      />
    </div>
  );
}
