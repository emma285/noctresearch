/** @type {import('next').NextConfig} */
const nextConfig = {
  // 코치 전용 파일 서버(/coach/asset)가 런타임에 coach-assets/ 를 읽으므로 번들에 포함
  outputFileTracingIncludes: {
    "/coach/asset/[file]": ["./coach-assets/**"],
  },
};
module.exports = nextConfig;
