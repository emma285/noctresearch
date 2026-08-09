/** @type {import('next').NextConfig} */
const nextConfig = {
  // 코치 전용 파일 서버(/coach/asset)가 런타임에 coach-assets/ 를 읽으므로 번들에 포함
  outputFileTracingIncludes: {
    "/coach/asset/[file]": ["./coach-assets/**"],
  },
  // 선수 기록 페이지는 개발 중 자주 바뀌므로 캐시 금지(항상 최신 CSS/HTML)
  async headers() {
    return [
      {
        source: "/log/:path*",
        headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }],
      },
    ];
  },
};
module.exports = nextConfig;
