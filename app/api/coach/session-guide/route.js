// app/api/coach/session-guide/route.js — 세션 가이드(세션 전 준비) AI 생성 + 저장. 코치 전용.
// generate: 최근 수면·루틴 타임라인 + 코치 논의포인트 + (지난 세션) → Claude가 목표·논의주제·확인·질문 초안.
// save: guide(jsonb) 저장.
import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { and, eq, lt, desc } from "drizzle-orm";
import { isCoachEmail } from "../../../../lib/coach";
import { db, schema } from "../../../../lib/db";
import { getLogTimeline, kstToday } from "../../../../lib/log";

const { sessions, clients } = schema;
export const runtime = "nodejs";
async function getClerk() { return typeof clerkClient === "function" ? await clerkClient() : clerkClient; }

const fmt = (m) => (m == null ? "?" : `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`);

// 타임라인 → 프롬프트용 텍스트 요약 (날짜별 수면 + 루틴)
function summarize({ cols, sleeps, routines }) {
  const days = cols.slice(1); // 첫 칸은 오프셋용
  return days.map((d) => {
    const s = sleeps.find((x) => x.date === d);
    const r = routines.filter((x) => x.date === d).sort((a, b) => a.t - b.t);
    const KO = { training: "훈련", caffeine: "카페인", nap: "낮잠", meal: "식사", alcohol: "술", etc: "기타" };
    const sl = s ? `수면: 취침 ${fmt(s.bed)}·기상 ${fmt(s.wake)}·입면 ${s.sol || "?"}·침대밖 ${s.out || "?"}·밤중깸 ${s.woke || 0}회${s.waso ? "(" + s.waso + ")" : ""}·느낌 ${s.feel}${s.memo ? "·메모 " + s.memo : ""}` : "수면 기록 없음";
    const rt = r.length ? "루틴: " + r.map((x) => `${fmt(x.t)} ${KO[x.type] || x.type}${x.d ? "(" + x.d + ")" : ""}`).join(", ") : "루틴 없음";
    return `[${d}] ${sl} / ${rt}`;
  }).join("\n");
}

const SYS = `너는 Emma(소정)의 수면코칭 세션 준비 도우미다. 코치가 다음 세션 전에 볼 "세션 가이드"를 만든다.
입력: 선수의 최근 수면·루틴 로그 요약 + 코치가 이번에 논의하려는 포인트 + (있으면) 지난 세션 노트.
로그의 실제 패턴(입면 지연·침대밖 시간·밤중깸·훈련/카페인/낮잠 타이밍 등)을 근거로, 코치가 세션에서 쓸 준비 문서를 만든다.

한국어. 친근하지만 실무적으로. em dash(—) 금지. 로그에 없는 사실 지어내지 말 것. 각 항목 갈래가 여럿이면 "1. 2. 3." 넘버링 + 줄바꿈(\\n).
반드시 JSON만 출력: {"goal":"이번 세션 목표 1~2문장","topics":"논의 주제(코치 논의포인트를 데이터 근거와 연결해 정리)","checks":"확인·점검할 것(로그에서 관찰된 패턴 기반)","questions":"세션에서 던질 질문 몇 개"}`;

export async function POST(request) {
  try {
    const { userId } = auth();
    if (!userId) return NextResponse.json({ success: false, message: "로그인이 필요해요." }, { status: 401 });
    const cc = await getClerk();
    const me = await cc.users.getUser(userId);
    if (!isCoachEmail(me?.emailAddresses?.[0]?.emailAddress)) return NextResponse.json({ success: false, message: "코치 권한이 없어요." }, { status: 403 });

    const { sessionId, action, discuss, guide } = await request.json();
    if (!sessionId) return NextResponse.json({ success: false, message: "세션 id 필요" }, { status: 400 });

    // 저장
    if (action === "save") {
      await db.update(sessions).set({ guide: guide || {} }).where(eq(sessions.id, sessionId));
      revalidateTag("athlete-data");
      return NextResponse.json({ success: true });
    }

    // 생성
    const s = (await db.select().from(sessions).where(eq(sessions.id, sessionId)).limit(1))[0];
    if (!s) return NextResponse.json({ success: false, message: "세션 없음" }, { status: 404 });
    const c = (await db.select().from(clients).where(eq(clients.id, s.clientId)).limit(1))[0];
    if (!c) return NextResponse.json({ success: false, message: "선수 없음" }, { status: 404 });

    const tl = await getLogTimeline(c.email, kstToday(), 5);
    let prev = "";
    if (s.n && s.n > 1) {
      const p = (await db.select().from(sessions).where(and(eq(sessions.clientId, s.clientId), lt(sessions.n, s.n))).orderBy(desc(sessions.n)).limit(1))[0];
      if (p) prev = `지난 세션(${p.n}회차) 요약: ${p.summary || ""}\n지난 처방/다음계획: ${p.detail?.plan || ""} ${p.detail?.next || ""}`;
    }

    const userMsg = `선수: ${c.name || c.email} (${c.program || "프로그램 미정"}) · ${s.n || 1}회차 세션 준비\n\n[최근 수면·루틴 로그]\n${summarize(tl)}\n\n[코치가 이번에 논의하려는 것]\n${discuss || "(미입력)"}\n${prev ? "\n[" + prev + "]" : ""}\n\n위를 바탕으로 세션 가이드 JSON을 만들어줘.`;

    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 1800, system: SYS, messages: [{ role: "user", content: userMsg }] }),
    });
    if (!r.ok) return NextResponse.json({ success: false, message: "AI 생성 실패: " + (await r.text()).slice(0, 150) }, { status: 500 });
    const j = await r.json();
    let txt = (j.content?.[0]?.text || "").trim().replace(/^```(?:json)?\s*|\s*```$/g, "").trim();
    const a = txt.indexOf("{"), b = txt.lastIndexOf("}");
    if (a >= 0 && b > a) txt = txt.slice(a, b + 1);
    let gen; try { gen = JSON.parse(txt); } catch { return NextResponse.json({ success: false, message: "AI 응답 파싱 실패" }, { status: 500 }); }

    const merged = { discuss: discuss || "", goal: gen.goal || "", topics: gen.topics || "", checks: gen.checks || "", questions: gen.questions || "", memo: (s.guide?.memo) || "" };
    await db.update(sessions).set({ guide: merged }).where(eq(sessions.id, sessionId));
    revalidateTag("athlete-data");
    return NextResponse.json({ success: true, guide: merged });
  } catch (e) {
    console.error("session-guide failed:", e?.message);
    return NextResponse.json({ success: false, message: e?.message || "실패" }, { status: 500 });
  }
}
