import { handleUpload } from "@vercel/blob/client";
import { NextResponse } from "next/server";

// 가민 캡처 클라이언트 직접 업로드 — 서버는 토큰만 발급, 파일은 브라우저가 Blob에 직접 전송.
// (Vercel 서버 요청 4.5MB 한계 우회 + 여러 장 안전)
export async function POST(request) {
  const body = await request.json();
  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => ({
        allowedContentTypes: [
          "image/png",
          "image/jpeg",
          "image/jpg",
          "image/webp",
          "image/heic",
          "image/heif",
        ],
        maximumSizeInBytes: 25 * 1024 * 1024, // 장당 25MB
        addRandomSuffix: true, // 파일명 충돌 방지 (접근 보호는 private 스토어가 담당)
        tokenPayload: clientPayload ?? null,
      }),
      onUploadCompleted: async ({ blob }) => {
        // 완료 콜백은 배포 환경에서만 발화(공개 URL 필요). 알림은 클라이언트가 /api/notify로 별도 처리.
        console.log("garmin blob uploaded:", blob.pathname);
      },
    });
    return NextResponse.json(jsonResponse);
  } catch (error) {
    // BLOB_READ_WRITE_TOKEN 미설정 시 여기로 떨어짐 → Vercel Blob 스토어 연결 필요
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
