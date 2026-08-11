// app/api/cron/routine-check/route.js
// 매일 23:59(KST)에 Vercel Cron이 호출 → 그날 "자기 전 루틴"을 1개라도 등록한 선수 여부만 슬랙(#코칭)으로.
// 슬립로그는 제출 즉시 알림(/api/log)이라 여기선 루틴만 집계.
import { Client } from "@notionhq/client";
import { NextResponse } from "next/server";
import { notifyCoaching } from "../../../../lib/notify";
import { getAllAthletes } from "../../../../lib/master";
import { kstToday } from "../../../../lib/log";

export const dynamic = "force-dynamic";

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const LOG_DB = process.env.NOTION_LOG_DATABASE_ID || "3b7565bc-0343-8190-a7ac-f326e916d318";

// 특정 이메일이 그날 등록한 루틴 개수
async function routineCount(email, date) {
  if (!email) return 0;
  try {
    const res = await notion.databases.query({
      database_id: LOG_DB,
      filter: {
        and: [
          { property: "계정", rich_text: { equals: email } },
          { property: "날짜", date: { equals: date } },
          { property: "종류", select: { equals: "루틴" } },
        ],
      },
      page_size: 100,
    });
    return res.results.length;
  } catch (e) {
    console.error("routineCount failed:", e?.message);
    return 0;
  }
}

export async function GET(request) {
  // Vercel Cron 인증 — CRON_SECRET 설정 시 Bearer 헤더 확인
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization") || "";
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
  }

  const date = kstToday();
  try {
    // 진행중 선수만 대상 (종료/온보딩 전 제외). 데모/내부 계정은 제외.
    const EXCLUDE = new Set(["contact@noct-research.com"]);
    const all = await getAllAthletes();
    const targets = all.filter((a) => a.email && a.status === "진행중" && !EXCLUDE.has(a.email.toLowerCase()));

    if (!targets.length) {
      return NextResponse.json({ ok: true, date, note: "진행중 선수 없음" });
    }

    const rows = [];
    for (const a of targets) {
      const n = await routineCount(a.email, date);
      rows.push({ name: a.name || a.email, n });
    }

    const [mo, d] = date.slice(5).split("-").map(Number);
    const lines = rows.map((r) => `${r.n > 0 ? "✅" : "❌"} ${r.name}${r.n > 0 ? ` (${r.n}개)` : " — 미등록"}`);
    const anyDone = rows.some((r) => r.n > 0);
    await notifyCoaching(
      [`🌆 *${mo}/${d} 오늘 자기 전 루틴 등록 현황*`, ...lines, anyDone ? "" : "\n오늘 루틴 남긴 선수가 없어요."]
        .filter(Boolean)
        .join("\n")
    );

    return NextResponse.json({ ok: true, date, results: rows });
  } catch (e) {
    return NextResponse.json({ ok: false, date, error: e?.message }, { status: 200 });
  }
}
