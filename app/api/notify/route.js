import { NextResponse } from "next/server";
import { notifyCoaching } from "../../../lib/notify";

// 가민 업로드 완료 시 코치에게 슬랙 알림 1건 (#코칭 채널).
export async function POST(request) {
  try {
    const { phone, count, folder, breakdown } = await request.json();
    const bd =
      breakdown && Object.keys(breakdown).length
        ? Object.entries(breakdown).map(([k, v]) => `${k} ${v}장`).join(" · ")
        : null;
    await notifyCoaching(
      [
        "*가민 수면 데이터 업로드 도착*",
        `연락처: ${phone || "-"}`,
        `이미지: 총 ${count ?? "?"}장${bd ? ` (${bd})` : ""}`,
        `Blob 폴더: garmin/${folder || ""}/`,
      ].join("\n")
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    // 알림 실패가 업로드 성공을 막지 않도록 200으로 응답
    return NextResponse.json({ ok: false, error: error.message });
  }
}
