#!/usr/bin/env node
// 세션 녹음 → 자동 코칭 노트 생성 (로컬 프로세서). 저장소 = Neon(sessions).
// 코치가 앱에서 세션 녹음(m4a) 업로드 → sessions.audio_url 저장 → 이 스크립트가 감지 →
// 다운로드 → ffmpeg 압축 → Whisper 전사 → Claude 상세/공개 초안(+다음세션 날짜 캐치) → 세션에 저장.
// 노트 공개는 항상 false(코치가 앱에서 검토·수정 후 공개). Vercel 타임아웃 회피용 로컬 실행.
//
// 사용: node scripts/process-session-audio.mjs           (대기 중인 세션 전부)
//       node scripts/process-session-audio.mjs <세션id>   (특정 세션만, 강제 재생성)
import { neon } from "@neondatabase/serverless";
import { readFileSync, existsSync, writeFileSync, unlinkSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";

// ── env 로드 (.env.local + .env) ──
const ROOT = new URL("..", import.meta.url).pathname;
for (const f of [".env.local", ".env"]) {
  const p = join(ROOT, f);
  if (!existsSync(p)) continue;
  for (const line of readFileSync(p, "utf8").split("\n")) {
    const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
const DB = process.env.DATABASE_URL;
const BLOB = process.env.BLOB_READ_WRITE_TOKEN;
const OPENAI = process.env.OPENAI_API_KEY;       // 전사(Whisper)
const ANTHROPIC = process.env.ANTHROPIC_API_KEY; // 초안 생성
if (!DB || !BLOB || !OPENAI || !ANTHROPIC) { console.error("env 부족: DATABASE_URL·BLOB_READ_WRITE_TOKEN·OPENAI_API_KEY·ANTHROPIC_API_KEY"); process.exit(1); }
const sql = neon(DB);
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const kstToday = () => new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);

// ── 상태 자동 승격: 세션 일시가 도래한 선수 → 진행중 (EARLY 상태만) ──
const EARLY = ["", "초대됨", "로그인", "intake제출", "온보딩완료"];
async function advanceStatuses() {
  const ids = await sql`SELECT DISTINCT client_id FROM sessions WHERE session_at IS NOT NULL AND session_at <= now() AND client_id IS NOT NULL`;
  for (const { client_id } of ids) {
    try {
      const r = await sql`UPDATE clients SET status='진행중', updated_at=now()
        WHERE id=${client_id} AND coalesce(status,'') = ANY(${EARLY}) RETURNING name`;
      if (r.length) log(`상태 승격: ${r[0].name || client_id.slice(0, 8)} → 진행중 (세션 날짜 도래)`);
    } catch (e) { log(`  상태 승격 오류(${client_id.slice(0, 8)}): ${e.message}`); }
  }
}

// ── 대기 세션: 녹음 있고 아직 미처리(detail에 chief 없음) & 락 없음 ──
async function pending() {
  return await sql`SELECT id, audio_url, n FROM sessions
    WHERE audio_url IS NOT NULL
      AND coalesce(detail->>'chief','') = ''
      AND coalesce(detail->>'_lock','') = ''
    LIMIT 20`;
}

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

// Whisper 단일 파일 전사. 재시도 2회(네트워크 흔들림 대비).
async function transcribeOne(file) {
  for (let attempt = 1; ; attempt++) {
    try {
      const fd = new FormData();
      fd.append("file", new Blob([readFileSync(file)], { type: "audio/mpeg" }), "audio.mp3");
      fd.append("model", "whisper-1");
      fd.append("language", "ko");
      fd.append("response_format", "text");
      const r = await fetch("https://api.openai.com/v1/audio/transcriptions", { method: "POST", headers: { authorization: `Bearer ${OPENAI}` }, body: fd });
      if (!r.ok) throw new Error(`Whisper ${r.status}: ${(await r.text()).slice(0, 200)}`);
      return (await r.text()).trim();
    } catch (e) {
      if (attempt >= 3) throw e;
      log(`    전사 재시도 ${attempt} (${e.message})`);
      await new Promise((res) => setTimeout(res, 3000));
    }
  }
}

// 긴 세션 오디오는 10분 단위로 분할 전사 (undici 5분 headersTimeout·25MB 한계 회피 후 합침).
async function transcribe(mp3) {
  const dir = tmpdir();
  const base = `chunk_${Date.now()}`;
  const pattern = join(dir, `${base}_%03d.mp3`);
  execFileSync("ffmpeg", ["-y", "-i", mp3, "-f", "segment", "-segment_time", "600", "-c", "copy", pattern], { stdio: "ignore" });
  const parts = [];
  for (let i = 0; ; i++) { const f = join(dir, `${base}_${String(i).padStart(3, "0")}.mp3`); if (!existsSync(f)) break; parts.push(f); }
  if (parts.length === 0) parts.push(mp3); // 분할 안 되면 통째로
  if (parts.length > 1) log(`  ${parts.length}개 조각으로 분할 전사`);
  let full = "";
  for (let i = 0; i < parts.length; i++) {
    const t = await transcribeOne(parts[i]);
    full += (full ? " " : "") + t;
    if (parts[i] !== mp3) { try { unlinkSync(parts[i]); } catch {} }
    if (parts.length > 1) log(`    조각 ${i + 1}/${parts.length} 전사 완료`);
  }
  return full.trim();
}

const SYS = `너는 Emma(소정)의 수면코칭 노트 작성 도우미다. 코칭 세션 전사(코치·선수 대화)를 읽고 두 종류의 노트를 한국어로 만든다.

[상세 노트 · 코치 내부용] — 간결한 실무체
- chief(주요 호소): 선수가 직접 한 말을 인용 위주로
- review(지난 주 리뷰): 지난 세션에 하기로 한 것 중 무엇을 했고 무엇을 못 했는지·그 반응. 세션에서 언급됐을 때만. 1회차거나 전사에 없으면 빈 문자열
- status(현재 상태): 훈련일/휴식일 수면 패턴 등 사실
- hypothesis(가설·원인 구조): 조건화·리듬·각성 등
- plan(이번 주 처방): 합의한 실천 + 근거
- next(다음 세션): 날짜·다룰 것·관찰 포인트
- memo(코치 메모): 기질·주의·아이디어

[공개 노트 · 선수 공유용] — 친근체 "~해요/~예요", 따뜻하게
- summary(세션 요약): 2~3문장
- actions(이번 주 함께 해볼 것): 문자열 배열 2~4개, 간결한 행동
- comment(코치 한마디): 1~2문장 응원/당부

[다음 세션 날짜]
- nextSessionDate: 전사에서 다음 세션 날짜/시각이 명시되면(예: "다음 주 화요일 3시", "9월 1일 오전 10시") ISO 문자열 "YYYY-MM-DDTHH:MM:00+09:00"로. 시각 안 정해졌으면 날짜만(T00:00). 불명확하면 빈 문자열. 오늘은 {TODAY} 기준으로 상대 날짜 계산.

규칙:
- 각 상세 항목에서 갈래가 여러 개면 각 줄 앞에 "1. " "2. " "3. " 넘버링을 붙이고 줄바꿈(\\n)으로 분리해 한눈에 읽히게. 갈래가 하나면 넘버 없이 그냥.
- em dash(—) 금지 · 번역투 금지 · 전사에 없는 사실 지어내지 말 것 · 애매하면 비워둠.
반드시 JSON만 출력: {"detail":{"chief":"","review":"","status":"","hypothesis":"","plan":"","next":"","memo":""},"public":{"summary":"","actions":[],"comment":""},"nextSessionDate":""}`;

// tool_use(structured output)로 항상 유효 JSON 강제 — 문단 내 줄바꿈/따옴표로 인한 JSON.parse 실패 방지.
const NOTE_TOOL = {
  name: "save_coaching_note",
  description: "코칭 세션 상세/공개 노트를 저장한다.",
  input_schema: {
    type: "object",
    properties: {
      detail: {
        type: "object",
        properties: {
          chief: { type: "string", description: "주요 호소(선수 인용 위주)" },
          review: { type: "string", description: "지난 주 리뷰. 1회차거나 없으면 빈 문자열" },
          status: { type: "string", description: "현재 상태(수면 패턴 등 사실)" },
          hypothesis: { type: "string", description: "가설·원인 구조" },
          plan: { type: "string", description: "이번 주 처방 + 근거" },
          next: { type: "string", description: "다음 세션에 다룰 것·관찰 포인트" },
          memo: { type: "string", description: "코치 메모" },
        },
        required: ["chief", "review", "status", "hypothesis", "plan", "next", "memo"],
      },
      public: {
        type: "object",
        properties: {
          summary: { type: "string", description: "세션 요약 2~3문장, 친근체" },
          actions: { type: "array", items: { type: "string" }, description: "이번 주 함께 해볼 것 2~4개" },
          comment: { type: "string", description: "코치 한마디 1~2문장" },
        },
        required: ["summary", "actions", "comment"],
      },
      nextSessionDate: { type: "string", description: "다음 세션 ISO(YYYY-MM-DDTHH:MM:00+09:00). 불명확하면 빈 문자열" },
    },
    required: ["detail", "public", "nextSessionDate"],
  },
};

async function generate(transcript, n) {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": ANTHROPIC, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 5000,
      system: SYS.replace("{TODAY}", kstToday()),
      tools: [NOTE_TOOL],
      tool_choice: { type: "tool", name: "save_coaching_note" },
      messages: [{ role: "user", content: `${n ? n + "회차 " : ""}코칭 세션 전사예요. save_coaching_note 도구로 상세·공개 노트를 채워 주세요.\n\n${transcript.slice(0, 100000)}` }],
    }),
  });
  if (!r.ok) throw new Error(`Claude ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const j = await r.json();
  const tu = (j.content || []).find((c) => c.type === "tool_use");
  if (!tu?.input) throw new Error("Claude tool_use 응답 없음");
  return tu.input;
}

// ── 세션에 저장 (공개=false 유지). detail에 nextSessionDate 병합(공개 시 다음세션 날짜로 사용) ──
async function saveToSession(id, draft, transcript) {
  const d = draft.detail || {};
  if (draft.nextSessionDate) d.nextSessionDate = draft.nextSessionDate;
  const pub = draft.public || {};
  const actions = Array.isArray(pub.actions) ? pub.actions.filter(Boolean).join("\n") : String(pub.actions || "");
  await sql`UPDATE sessions SET
      detail=${JSON.stringify(d)}::jsonb, summary=${pub.summary || ""}, action_items=${actions},
      coach_comment=${pub.comment || ""}, transcript=${transcript}
    WHERE id=${id}`;
}

async function processOne(s) {
  log(`▶ ${s.n || "?"}회차 (${String(s.id).slice(0, 8)}) 처리 시작`);
  // 락: detail에 _lock 병합 → 다음 폴링이 같은 세션 안 잡음
  await sql`UPDATE sessions SET detail = coalesce(detail,'{}'::jsonb) || '{"_lock":"⏳"}'::jsonb WHERE id=${s.id}`;
  const mp3 = await fetchAndCompress(s.audio_url, s.id);
  log("  압축 완료 → 전사 중…");
  const transcript = await transcribe(mp3);
  unlinkSync(mp3);
  log(`  전사 ${transcript.length}자 → 초안 생성 중…`);
  const draft = await generate(transcript, s.n);
  await saveToSession(s.id, draft, transcript);
  log(`  ✅ 저장 완료 (공개=off, 코치 검토 대기)${draft.nextSessionDate ? ` · 다음세션 ${draft.nextSessionDate.slice(0, 10)} 캐치` : ""}`);
}

(async () => {
  const arg = process.argv[2];
  let list;
  if (arg) {
    const rows = await sql`SELECT id, audio_url, n FROM sessions WHERE id=${arg}`;
    if (!rows.length || !rows[0].audio_url) { console.error("이 세션에 녹음 URL이 없어요."); process.exit(1); }
    list = rows;
  } else {
    try { await advanceStatuses(); } catch (e) { log(`상태 승격 실패: ${e.message}`); }
    list = await pending();
    log(`대기 세션 ${list.length}건`);
  }
  for (const s of list) {
    try {
      await processOne(s);
    } catch (e) {
      log(`  ❌ 실패: ${e.message}`);
      // 락 해제 (재시도되게 _lock 제거)
      try { await sql`UPDATE sessions SET detail = detail - '_lock' WHERE id=${s.id}`; } catch {}
    }
  }
  log("완료");
})();
