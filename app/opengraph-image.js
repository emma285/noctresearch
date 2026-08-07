import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const alt = "운동선수 수면코칭 | 녹트리서치";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const FONT = "https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/packages/pretendard/dist/public/static/";

// public 폴더에서 직접 읽어 data URI (HTTP fetch 의존 X — 빌드 prerender 안전)
async function localUri(rel, mime) {
  try {
    const buf = await readFile(join(process.cwd(), "public", rel));
    return `data:${mime};base64,${buf.toString("base64")}`;
  } catch (_) {
    return null;
  }
}

export default async function Image() {
  const [bold, regular] = await Promise.all([
    fetch(FONT + "Pretendard-Bold.otf").then((r) => r.arrayBuffer()),
    fetch(FONT + "Pretendard-Regular.otf").then((r) => r.arrayBuffer()),
  ]);
  const logo = await localUri("noct-logo.png", "image/png");

  const navyIndigo = "linear-gradient(135deg, #0D1B2A 0%, #24306b 55%, #4355B0 100%)";
  // 수면 구조/컨디션 바 차트 (CSS로 그림 — 이미지 의존 X)
  const bars = [38, 62, 48, 78, 92, 70, 52, 84, 58, 74, 44, 88, 66, 50];

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#ffffff", fontFamily: "Pretendard" }}>
        {/* 왼쪽 */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", position: "relative", padding: "40px 60px" }}>
          <div style={{ position: "absolute", top: 40, left: 60, display: "flex", alignItems: "center" }}>
            {logo ? (
              <img src={logo} height={38} style={{ objectFit: "contain" }} />
            ) : (
              <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: 3, color: "#0b0e14" }}>NOCT RESEARCH</div>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex" }}>
              <div style={{ display: "flex", background: "#EEF0FB", color: "#4355B0", fontSize: 20, fontWeight: 700, padding: "8px 18px", borderRadius: 999, letterSpacing: 2 }}>
                ATHLETE SLEEP COACHING
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", marginTop: 26 }}>
              <div style={{ fontSize: 64, fontWeight: 700, color: "#0D1B2A", lineHeight: 1.16, letterSpacing: -1.5 }}>경기력을 끌어올리는</div>
              <div style={{ fontSize: 64, fontWeight: 700, color: "#0D1B2A", lineHeight: 1.16, letterSpacing: -1.5 }}>운동선수 수면 코칭</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", marginTop: 24 }}>
              <div style={{ fontSize: 27, fontWeight: 400, color: "#6b7280", lineHeight: 1.45 }}>수면 진단부터 컨디션 관리까지</div>
              <div style={{ fontSize: 27, fontWeight: 400, color: "#6b7280", lineHeight: 1.45 }}>선수 맞춤 1:1 코칭 프로그램</div>
            </div>
          </div>
        </div>

        {/* 오른쪽 인디고 패널 + 폰(수면 리포트 차트) */}
        <div style={{ width: 452, height: 630, display: "flex", alignItems: "center", justifyContent: "center", background: navyIndigo, overflow: "hidden" }}>
          <div
            style={{
              width: 252,
              display: "flex",
              flexDirection: "column",
              background: "#0b0e14",
              borderRadius: 42,
              border: "7px solid #ffffff",
              boxShadow: "0 30px 80px rgba(0,0,0,0.5)",
              padding: "24px 20px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", marginBottom: 18 }}>
              <div style={{ width: 8, height: 8, borderRadius: 4, background: "#7EC8E3", marginRight: 8 }} />
              <div style={{ display: "flex", color: "#ffffff", fontSize: 15, fontWeight: 700 }}>수면 리포트</div>
            </div>

            {/* 점수 */}
            <div style={{ display: "flex", alignItems: "flex-end", marginBottom: 6 }}>
              <div style={{ display: "flex", color: "#ffffff", fontSize: 44, fontWeight: 700, lineHeight: 1 }}>82</div>
              <div style={{ display: "flex", color: "rgba(255,255,255,0.5)", fontSize: 16, fontWeight: 600, marginLeft: 6, marginBottom: 5 }}>/100</div>
            </div>
            <div style={{ display: "flex", color: "rgba(255,255,255,0.55)", fontSize: 12, fontWeight: 600, marginBottom: 18 }}>이번 주 수면 회복</div>

            {/* 바 차트 */}
            <div style={{ display: "flex", alignItems: "flex-end", height: 96, gap: 5 }}>
              {bars.map((h, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    flex: 1,
                    height: h,
                    borderRadius: 3,
                    background: "linear-gradient(180deg, #7EC8E3 0%, #4355B0 100%)",
                  }}
                />
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10 }}>
              <div style={{ display: "flex", color: "rgba(255,255,255,0.4)", fontSize: 11 }}>월</div>
              <div style={{ display: "flex", color: "rgba(255,255,255,0.4)", fontSize: 11 }}>일</div>
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Pretendard", data: bold, weight: 700, style: "normal" },
        { name: "Pretendard", data: regular, weight: 400, style: "normal" },
      ],
    }
  );
}
