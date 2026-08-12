#!/usr/bin/env node
// 세션 녹음 → 자동 코칭 노트 생성 (로컬 프로세서).
// 앱에서 코치가 세션 녹음(m4a)을 업로드하면 세션 DB의 "녹음 URL"에 저장됨.
// 이 스크립트가 감지 → 다운로드 → ffmpeg 압축 → Whisper 전사 → GPT가 상세/공개 초안 생성 → 세션에 저장.
// 노트 공개는 항상 false(코치가 앱에서 검토·수정 후 공개). Vercel 타임아웃 회피용 로컬 실행.
//
// 사용: node scripts/process-session-audio.mjs           (대기 중인 세션 전부)
//       node scripts/process-session-audio.mjs <세션id>   (특정 세션만, 강제 재생성)
import { Client } from "@notionhq/client";
import { readFileSync, existsSync, writeFileSync, unlinkSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";

// ── env 로드 (.env.local) ──
const ROOT = new URL("..", import.meta.url).pathname;
for (const f of [".env.local", ".env"]) {
  const p = join(ROOT, f);
  if (!existsSync(p)) continue;
  for (const line of readFileSync(p, "utf8").split("\n")) {
    const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
const NOTION = process.env.NOTION_API_KEY;
const BLOB = process.env.BLOB_READ_WRITE_TOKEN;
const OPENAI = process.env.OPENAI_API_KEY;      // 전사(Whisper)용
const ANTHROPIC = process.env.ANTHROPIC_API_KEY; // 초안 생성용
const SESSIONS_DB = process.env.NOTION_SESSIONS_DATABASE_ID || "349e906e42e94e1592679d390fbe2916";
if (!NOTION || !BLOB || !OPENAI || !ANTHROPIC) { console.error("env 부족: NOTION_API_KEY·BLOB_READ_WRITE_TOKEN·OPENAI_API_KEY·ANTHROPIC_API_KEY"); process.exit(1); }
const notion = new Client({ auth: NOTION });
const rtText = (arr) => (arr || []).map((t) => t.plain_text).join("");
const rtLong = (s) => { const out = []; const str = String(s || ""); for (let i = 0; i < str.length; i += 1900) out.push({ type: "text", text: { content: str.slice(i, i + 1900) } }); return out; };
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

// ── 대기 세션 찾기: 녹음 URL 있고 상세 노트 비어있음 ──
async function pending() {
  const res = await notion.databases.query({
    database_id: SESSIONS_DB,
    filter: { and: [{ property: "녹음 URL", url: { is_not_empty: true } }, { property: "상세 노트", rich_text: { is_empty: true } }] },
    page_size: 20,
  });
  return res.results.map((p) => ({ id: p.id, url: p.properties["녹음 URL"]?.url, n: p.properties["회차"]?.number }));
}

// ── 1) 다운로드 + 2) ffmpeg 압축 ──
async function fetchAndCompress(url, id) {
  const raw = join(tmpdir(), `sess_${id}.orig`);
  const mp3 = join(tmpdir(), `sess_${id}.mp3`);
  const res = await fetch(url, { headers: { authorization: `Bearer ${BLOB}` } });
  if (!res.ok) throw new Error(`다운로드 실패 ${res.status}`);
  writeFileSync(raw, Buffer.from(await res.arrayBuffer()));
  execFileSync("ffmpeg", ["-y", "-i", raw, "-ac", "1", "-ar", "16000", "-b:a", "32k", mp3], { stdio: "ignore" });
  unlinkSync(raw);
  const mb = statSync(mp3).size / 1024 / 1024;
  if (mb > 24.5) throw new Error(`압축 후에도 ${mb.toFixed(1)}MB (25MB 초과) — 분할 필요`);
  return mp3;
}

// ── 3) Whisper 전사 ──
async function transcribe(mp3) {
  const fd = new FormData();
  fd.append("file", new Blob([readFileSync(mp3)], { type: "audio/mpeg" }), "audio.mp3");
  fd.append("model", "whisper-1");
  fd.append("language", "ko");
  fd.append("response_format", "text");
  const r = await fetch("https://api.openai.com/v1/audio/transcriptions", { method: "POST", headers: { authorization: `Bearer ${OPENAI}` }, body: fd });
  if (!r.ok) throw new Error(`Whisper ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return (await r.text()).trim();
}

// ── 4) GPT가 상세/공개 초안 생성 ──
const SYS = `너는 Emma(소정)의 수면코칭 노트 작성 도우미다. 코칭 세션 전사(코치·선수 대화)를 읽고 두 종류의 노트를 한국어로 만든다.

[상세 노트 · 코치 내부용] — 간결한 실무체
- chief(주요 호소): 선수가 직접 한 말을 인용 위주로
- status(현재 상태): 훈련일/휴식일 수면 패턴 등 사실
- hypothesis(가설·원인 구조): 조건화·리듬·각성 등
- plan(이번 주 처방): 합의한 실천 + 근거
- next(다음 세션): 날짜·다룰 것·관찰 포인트
- memo(코치 메모): 기질·주의·아이디어

[공개 노트 · 선수 공유용] — 친근체 "~해요/~예요", 따뜻하게
- summary(세션 요약): 2~3문장
- actions(이번 주 함께 해볼 것): 문자열 배열 2~4개, 간결한 행동
- comment(코치 한마디): 1~2문장 응원/당부

규칙: em dash(—) 금지 · 번역투 금지 · 전사에 없는 사실 지어내지 말 것 · 애매하면 비워둠.
반드시 JSON만 출력: {"detail":{"chief":"","status":"","hypothesis":"","plan":"","next":"","memo":""},"public":{"summary":"","actions":[],"comment":""}}`;

async function generate(transcript, n) {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": ANTHROPIC, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 2500,
      system: SYS,
      messages: [{ role: "user", content: `${n ? n + "회차 " : ""}코칭 세션 전사예요. 상세 노트와 공개 노트를 만들어 주세요. JSON만 출력.\n\n${transcript.slice(0, 100000)}` }],
    }),
  });
  if (!r.ok) throw new Error(`Claude ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const j = await r.json();
  let txt = (j.content?.[0]?.text || "").trim().replace(/^```(?:json)?\s*|\s*```$/g, "").trim();
  return JSON.parse(txt);
}

// ── 5) 세션에 저장 (노트 공개는 false 유지) ──
async function saveToSession(id, draft, transcript) {
  const d = draft.detail || {};
  const pub = draft.public || {};
  const actions = Array.isArray(pub.actions) ? pub.actions.filter(Boolean).join("\n") : String(pub.actions || "");
  await notion.pages.update({
    page_id: id,
    properties: {
      "상세 노트": { rich_text: rtLong(JSON.stringify(d)) },
      "세션 요약": { rich_text: rtLong(pub.summary || "") },
      "실천 항목": { rich_text: rtLong(actions) },
      "코치 코멘트": { rich_text: rtLong(pub.comment || "") },
      "전사": { rich_text: rtLong(transcript) },
    },
  });
}

async function processOne(s) {
  log(`▶ ${s.n || "?"}회차 (${s.id.slice(0, 8)}) 처리 시작`);
  // 락: 상세 노트를 "생성 중"으로 채워 다음 폴링이 같은 세션을 다시 잡지 않게 (is_empty=false)
  await notion.pages.update({ page_id: s.id, properties: { "상세 노트": rtLong("⏳ 초안 생성 중…") } });
  const mp3 = await fetchAndCompress(s.url, s.id);
  log("  압축 완료 → 전사 중…");
  const transcript = await transcribe(mp3);
  unlinkSync(mp3);
  log(`  전사 ${transcript.length}자 → 초안 생성 중…`);
  const draft = await generate(transcript, s.n);
  await saveToSession(s.id, draft, transcript);
  log(`  ✅ 저장 완료 (공개=off, 코치 검토 대기)`);
}

(async () => {
  const arg = process.argv[2];
  let list;
  if (arg) {
    const p = await notion.pages.retrieve({ page_id: arg });
    list = [{ id: p.id, url: p.properties["녹음 URL"]?.url, n: p.properties["회차"]?.number }];
    if (!list[0].url) { console.error("이 세션에 녹음 URL이 없어요."); process.exit(1); }
  } else {
    list = await pending();
    log(`대기 세션 ${list.length}건`);
  }
  for (const s of list) {
    try {
      await processOne(s);
    } catch (e) {
      log(`  ❌ 실패: ${e.message}`);
      // 락 해제 — 다음 폴링에서 재시도되게 상세 노트 비움
      try { await notion.pages.update({ page_id: s.id, properties: { "상세 노트": { rich_text: [] } } }); } catch {}
    }
  }
  log("완료");
})();
