// lib/whoop/crypto.js — WHOOP 토큰 암호화(AES-256-GCM) + OAuth state 서명.
// 토큰은 계정접근권이라 평문 저장 금지 → WHOOP_TOKEN_ENC_KEY(base64 32바이트)로 암호화 후 Neon 저장.
import { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

function getKey() {
  const raw = process.env.WHOOP_TOKEN_ENC_KEY || "";
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) throw new Error("WHOOP_TOKEN_ENC_KEY must be base64 of 32 bytes");
  return key;
}

// 평문 → "v1:iv:tag:ciphertext" (각 base64). 복호화 시 tag로 위변조 검출.
export function encryptToken(plain) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
  const ct = Buffer.concat([cipher.update(String(plain), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ["v1", iv.toString("base64"), tag.toString("base64"), ct.toString("base64")].join(":");
}

export function decryptToken(enc) {
  const [v, iv, tag, ct] = String(enc || "").split(":");
  if (v !== "v1" || !iv || !tag || !ct) throw new Error("invalid encrypted token format");
  const decipher = createDecipheriv("aes-256-gcm", getKey(), Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(ct, "base64")), decipher.final()]).toString("utf8");
}

export const STATE_COOKIE = "whoop_oauth_state";

// OAuth state — CSRF 방지 + Clerk userId 바인딩.
// state(랜덤)는 WHOOP로 보내고, 쿠키에는 "state.userId.서명"을 둬서 callback에서 대조.
function sign(data) {
  return createHmac("sha256", getKey()).update(data).digest("base64url");
}

export function newOAuthState(userId) {
  const state = randomBytes(16).toString("hex"); // WHOOP: 8자 이상
  const cookie = `${state}.${userId}.${sign(`${state}.${userId}`)}`;
  return { state, cookie };
}

// 쿠키 값과 query state, 현재 로그인 userId가 모두 맞을 때만 true.
export function verifyOAuthState(cookieValue, stateFromQuery, userId) {
  const parts = String(cookieValue || "").split(".");
  if (parts.length !== 3) return false;
  const [state, uid, sig] = parts;
  const expected = sign(`${state}.${uid}`);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  return state === stateFromQuery && uid === userId;
}
