#!/usr/bin/env node
// 이지수 세션 녹음 파일 → Vercel Blob(private) 업로드 + sessions.audio_url 설정.
// 이후 process-session-audio.mjs <id> 가 전사·노트 생성.
// 사용: node scripts/jisoo-upload-audio.mjs <n> <file>
import { readFileSync, existsSync } from "node:fs";
import { basename } from "node:path";
import { put } from "@vercel/blob";
import { neon } from "@neondatabase/serverless";

for (const f of [".env.local", ".env"]) { if (!existsSync(f)) continue;
  for (const l of readFileSync(f, "utf8").split("\n")) { const m = /^([A-Z0-9_]+)=(.*)$/.exec(l.trim()); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ""); } }

const CLIENT_ID = "3b9565bc-0343-8135-a17c-ce80de18f10c";
const n = parseInt(process.argv[2], 10);
const file = process.argv[3];
if (!n || !file || !existsSync(file)) { console.error("사용: node scripts/jisoo-upload-audio.mjs <n> <file>"); process.exit(1); }

const sql = neon(process.env.DATABASE_URL);
const sess = (await sql`SELECT id, audio_url FROM sessions WHERE client_id=${CLIENT_ID} AND n=${n}`)[0];
if (!sess) { console.error(`S${n} 세션 없음`); process.exit(1); }

const buf = readFileSync(file);
const pathname = `sessions/jisoo-S${n}-${basename(file)}`;
console.log(`업로드 중: ${pathname} (${(buf.length / 1024 / 1024).toFixed(1)}MB)…`);
const blob = await put(pathname, buf, { access: "private", addRandomSuffix: true, token: process.env.BLOB_READ_WRITE_TOKEN });
await sql`UPDATE sessions SET audio_url=${blob.url} WHERE id=${sess.id}`;
console.log(`✅ S${n} audio_url 설정: ${sess.id}`);
console.log(blob.url);
