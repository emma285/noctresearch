// app/api/coach/targets/route.js — 프로토콜 비교 목표(sleep_targets) 관리 (코치 전용).
// 부가자료 HTML의 <script id="protocol-targets"> JSON을 읽어 sleep_targets에 반영/해제.
import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { and, eq } from "drizzle-orm";
import { db, schema } from "../../../../lib/db";
import { isCoachEmail } from "../../../../lib/coach";
import { extractProtocolTargets } from "../../../../lib/protocolExtract";
import { kstToday } from "../../../../lib/log";

const { sleepTargets } = schema;
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function getClerk() { return typeof clerkClient === "function" ? await clerkClient() : clerkClient; }
async function requireCoach() {
  const { userId } = auth(); if (!userId) return null;
  const cc = await getClerk(); const me = await cc.users.getUser(userId);
  const email = me?.emailAddresses?.[0]?.emailAddress;
  return isCoachEmail(email) ? email : null;
}
const hhmmToMin = (s) => { const m = /^(\d{1,2}):(\d{2})$/.exec(String(s || "").trim()); return m ? (+m[1] % 24) * 60 + +m[2] : null; };

// 부가자료 HTML → 프로토콜 목표. 명시 블록(#protocol-targets)이 없으면 타임테이블에서 자동 추출.
async function readProtocolTargets(slug) {
  if (!/^[a-z0-9-]+$/i.test(slug)) return null;
  let html;
  try { html = await readFile(path.join(process.cwd(), "coach-assets", `${slug}.html`), "utf8"); } catch { return null; }
  const data = extractProtocolTargets(html, { nowISO: kstToday() });
  return data.targets.length ? data : null;
}

// POST { clientId, slug } → 그 프로토콜 목표를 sleep_targets에 반영(같은 slug 기존분 교체)
export async function POST(request) {
  if (!(await requireCoach())) return NextResponse.json({ success: false, message: "코치만 가능해요." }, { status: 403 });
  try {
    const { clientId, slug } = await request.json();
    if (!clientId || !slug) return NextResponse.json({ success: false, message: "clientId·slug가 필요해요." }, { status: 400 });
    const data = await readProtocolTargets(slug);
    if (!data || !Array.isArray(data.targets) || !data.targets.length) {
      return NextResponse.json({ success: false, message: "이 자료엔 프로토콜 목표(취침/기상)가 없어요." });
    }
    const rows = data.targets
      .map((t) => ({ clientId, date: t.date, bedMin: hhmmToMin(t.bed), wakeMin: hhmmToMin(t.wake), label: t.label || data.name || "", protocolEventId: slug }))
      .filter((r) => r.date && r.bedMin != null && r.wakeMin != null);
    if (!rows.length) return NextResponse.json({ success: false, message: "유효한 목표가 없어요." });
    await db.delete(sleepTargets).where(and(eq(sleepTargets.clientId, clientId), eq(sleepTargets.protocolEventId, slug)));
    await db.insert(sleepTargets).values(rows);
    return NextResponse.json({ success: true, count: rows.length, name: data.name || slug });
  } catch (e) {
    return NextResponse.json({ success: false, error: e?.message || "저장 실패" }, { status: 500 });
  }
}

// DELETE { clientId, slug } → 그 프로토콜 목표 제거
export async function DELETE(request) {
  if (!(await requireCoach())) return NextResponse.json({ success: false, message: "코치만 가능해요." }, { status: 403 });
  try {
    const { clientId, slug } = await request.json();
    if (!clientId || !slug) return NextResponse.json({ success: false, message: "clientId·slug가 필요해요." }, { status: 400 });
    await db.delete(sleepTargets).where(and(eq(sleepTargets.clientId, clientId), eq(sleepTargets.protocolEventId, slug)));
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ success: false, error: e?.message }, { status: 500 });
  }
}
