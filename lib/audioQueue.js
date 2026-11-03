// lib/audioQueue.js — 녹음 전사 대기 '쪽지' (Blob 고정 경로).
// 녹음 저장 시 쪽지를 남기면, 로컬 처리기(scripts/process-session-audio.mjs)가 쪽지만 확인(head)하고
// 있을 때만 Neon에 접속 → 할 일 없을 땐 DB를 안 깨워 compute(CU-h) 소진 방지. (2026-10-31)
import { put } from "@vercel/blob";

export const AUDIO_QUEUE_PATH = "_queue/session-audio";

export async function markAudioPending(sessionId) {
  try {
    await put(AUDIO_QUEUE_PATH, String(sessionId || ""), {
      access: "private", addRandomSuffix: false, allowOverwrite: true, contentType: "text/plain",
    });
  } catch (e) { console.error("markAudioPending failed:", e?.message); }
}
