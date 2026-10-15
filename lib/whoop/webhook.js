// lib/whoop/webhook.js — WHOOP 웹훅 서명검증 + 이벤트 → 할 일 결정. (DB·HTTP 없음 → 테스트 쉬움)
// 공식 문서: https://developer.whoop.com/docs/developing/webhooks
// v2 payload = { user_id, id, type, trace_id }. sleep/recovery 모두 id = 수면 UUID (recovery도 cycle id 아님).
import { createHmac, timingSafeEqual } from "node:crypto";

// sig = base64( HMAC_SHA256(timestamp + rawBody, client secret) ) 와 X-WHOOP-Signature 비교
export function verifyWebhookSignature(rawBody, timestamp, signature, secret) {
  if (!rawBody || !timestamp || !signature || !secret) return false;
  const expected = createHmac("sha256", secret).update(String(timestamp) + rawBody).digest("base64");
  const a = Buffer.from(String(signature));
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

// 이벤트 → 할 일. 같은 이벤트가 여러 번 와도(재시도·중복) 결과가 같도록 전부 "다시 가져와 덮어쓰기/지우기"로 처리
// → trace_id 저장 없이도 중복 안전.
export function planWebhookAction(event) {
  const id = event?.id != null ? String(event.id) : "";
  if (!id || event?.user_id == null) return { action: "ignore", reason: "bad_payload" };
  switch (event.type) {
    case "sleep.updated":    return { action: "upsert_sleep", sleepId: id };
    case "sleep.deleted":    return { action: "delete_sleep", sleepId: id };
    case "recovery.updated": return { action: "upsert_recovery", sleepId: id };
    case "recovery.deleted": return { action: "delete_recovery", sleepId: id };
    default:                 return { action: "ignore", reason: "unsupported_type" }; // workout.* 등 — 저장 안 함
  }
}
