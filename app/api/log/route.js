// app/api/log/route.js
// 선수 기록(수면·루틴) 저장·조회 — Neon(logs 테이블). 이메일(user_email)로 식별.
// 응답 형태는 기존 Notion 버전과 100% 동일하게 유지(프론트 무변경).
// 본인 기록만: 이메일은 요청값(user)이 아니라 로그인 세션에서 가져옴. 비로그인 → 401.
import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { and, eq, gte, lt, desc } from "drizzle-orm";
import { db, schema } from "../../../lib/db";
import { getCurrentUser } from "../../../lib/whoop/session";

const UNAUTHORIZED = () => NextResponse.json({ success: false, message: "로그인이 필요해요." }, { status: 401 });

const { logs } = schema;

// ── 저장 ──  POST { user, kind:'sleep'|'routine', date, summary, data, overwrite? }
export async function POST(request) {
  try {
    const me = await getCurrentUser();
    if (!me) return UNAUTHORIZED();
    const body = await request.json();
    const user = me.email;
    const kind = body.kind === "sleep" ? "sleep" : "routine";
    const date = body.date || new Date().toISOString().slice(0, 10);
    const summary = body.summary || "";
    const data = body.data || {};

    // 수면은 하루 1건 — 같은 날짜 기존 있으면 확인. overwrite 아니면 막고 exists 반환.
    if (kind === "sleep") {
      const dup = await db.select({ id: logs.id }).from(logs)
        .where(and(eq(logs.userEmail, user), eq(logs.date, date), eq(logs.kind, "sleep")));
      if (dup.length > 0) {
        if (!body.overwrite) return NextResponse.json({ success: false, exists: true });
        await db.delete(logs).where(and(eq(logs.userEmail, user), eq(logs.date, date), eq(logs.kind, "sleep")));
      }
    }

    const [row] = await db.insert(logs)
      .values({ userEmail: user, date, kind, summary, data })
      .returning({ id: logs.id });

    revalidateTag("athlete-data");
    return NextResponse.json({ success: true, id: row.id });
  } catch (e) {
    return NextResponse.json({ success: false, error: e?.message || "save failed" }, { status: 500 });
  }
}

// ── 수정(블록 1개) ──  PATCH { id, summary, data }
export async function PATCH(request) {
  try {
    const me = await getCurrentUser();
    if (!me) return UNAUTHORIZED();
    const { id, summary, data } = await request.json();
    if (!id) return NextResponse.json({ success: false, message: "id 없음" }, { status: 400 });
    const patch = {};
    if (summary !== undefined) patch.summary = summary;
    if (data !== undefined) patch.data = data;
    await db.update(logs).set(patch).where(and(eq(logs.id, id), eq(logs.userEmail, me.email)));
    revalidateTag("athlete-data");
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ success: false, error: e?.message }, { status: 500 });
  }
}

// ── 삭제 ──  DELETE { id }
export async function DELETE(request) {
  try {
    const me = await getCurrentUser();
    if (!me) return UNAUTHORIZED();
    const { id } = await request.json();
    if (!id) return NextResponse.json({ success: false, message: "id 없음" }, { status: 400 });
    await db.delete(logs).where(and(eq(logs.id, id), eq(logs.userEmail, me.email)));
    revalidateTag("athlete-data");
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ success: false, error: e?.message }, { status: 500 });
  }
}

// ── 조회(월별) ──  GET ?user=<email>&month=YYYY-MM  (user는 호환용, 실제는 로그인 본인)
// → { days: { "YYYY-MM-DD": {sleep, routine, sleepSummary, items[], blocks[]} } }
export async function GET(request) {
  try {
    const url = new URL(request.url);
    const month = url.searchParams.get("month");
    if (!url.searchParams.get("user")) return NextResponse.json({ ok: true, route: "log", db: "neon" });
    const me = await getCurrentUser();
    if (!me) return UNAUTHORIZED();
    const user = me.email;

    // 최근 로그 tz (위저드가 "타임존 바뀜" 감지용). 최근 8건 중 tz 있는 첫 값.
    if (url.searchParams.get("latestTz")) {
      const rows = await db.select({ data: logs.data }).from(logs)
        .where(eq(logs.userEmail, user)).orderBy(desc(logs.createdAt)).limit(8);
      let tz = null;
      for (const r of rows) { const t = r.data?.wakeTz || r.data?.tz; if (t) { tz = t; break; } }
      return NextResponse.json({ tz });
    }

    const where = [eq(logs.userEmail, user)];
    if (month && /^\d{4}-\d{2}$/.test(month)) {
      const [y, m] = month.split("-").map(Number);
      const nm = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
      where.push(gte(logs.date, `${month}-01`), lt(logs.date, `${nm}-01`));
    }

    const rows = await db.select().from(logs).where(and(...where));
    const days = {};
    for (const p of rows) {
      const date = p.date;
      if (!date) continue;
      if (!days[date]) days[date] = { sleep: false, routine: 0, sleepSummary: "", items: [], blocks: [] };
      if (p.kind === "sleep") {
        days[date].sleep = true;
        if (p.summary) days[date].sleepSummary = p.summary;
      } else {
        days[date].routine += 1;
        if (p.summary) days[date].items.push(p.summary);
        const d = p.data || null;
        if (d && (d.time || d.type)) days[date].blocks.push({ nid: p.id, ...d });
      }
    }
    return NextResponse.json({ days });
  } catch (e) {
    return NextResponse.json({ days: {}, error: e?.message }, { status: 200 });
  }
}
