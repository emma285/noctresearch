// app/api/whoop/webhook/route.js — WHOOP가 "데이터 바뀜" 알림을 보내는 곳. (대시보드 Webhook URL에 등록)
// 서명검증(원문 바디) → 이벤트별로 WHOOP에서 다시 가져와 upsert/삭제 → 2xx.
// 실패 시 500 → WHOOP가 약 1시간 동안 5번 재시도. 처리 자체가 덮어쓰기라 중복 수신해도 안전.
import { NextResponse } from "next/server";
import { verifyWebhookSignature } from "../../../../lib/whoop/webhook";
import { handleWebhookEvent } from "../../../../lib/whoop/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  const secret = process.env.WHOOP_CLIENT_SECRET;
  if (!secret) {
    console.error("whoop webhook: WHOOP_CLIENT_SECRET missing");
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  const raw = await request.text(); // 파싱 전 원문으로 서명 계산해야 함
  const ok = verifyWebhookSignature(
    raw,
    request.headers.get("x-whoop-signature-timestamp"),
    request.headers.get("x-whoop-signature"),
    secret,
  );
  if (!ok) return NextResponse.json({ ok: false }, { status: 401 });

  let event;
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: true, result: "ignored:bad_json" }); // 재시도해도 똑같으니 2xx
  }

  try {
    const result = await handleWebhookEvent(event);
    console.log("whoop webhook:", event.type, event.trace_id, result); // 건강 수치는 로그 금지
    return NextResponse.json({ ok: true, result });
  } catch (e) {
    console.error("whoop webhook failed:", event.type, event.trace_id, e?.message);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
