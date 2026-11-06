// app/coach/clients/[id]/whoop-report/route.js — 코치 전용 WHOOP 리포트(선수별 실제 데이터).
// 템플릿(report-assets/whoop-report.html)의 __DATA__ 자리에 그 선수 데이터를 넣어 HTML로 돌려준다.
import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { isCoachEmail } from "../../../../../lib/coach";
import { getAthleteByRef } from "../../../../../lib/master";
import { buildReportData } from "../../../../../lib/whoop/report";
import { logAccess } from "../../../../../lib/accessLog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function getClerk() { return typeof clerkClient === "function" ? await clerkClient() : clerkClient; }
const page = (msg) => new NextResponse(
  `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">` +
  `<body style="margin:0;padding:48px 24px;background:#0f1115;color:#e7e9ee;font:15px/1.6 -apple-system,BlinkMacSystemFont,'Apple SD Gothic Neo',sans-serif">${msg}</body>`,
  { headers: { "content-type": "text/html; charset=utf-8" } },
);

export async function GET(request, { params }) {
  try {
    const { userId } = auth();
    if (!userId) return new NextResponse("로그인이 필요해요.", { status: 401 });
    const cc = await getClerk();
    const me = await cc.users.getUser(userId);
    const myEmail = me?.emailAddresses?.[0]?.emailAddress;
    if (!isCoachEmail(myEmail)) return new NextResponse("코치 권한이 없어요.", { status: 403 });

    const id = String(params?.id || "");
    const athlete = await getAthleteByRef(id);
    if (!athlete?.email) return page("선수를 찾을 수 없어요.");

    const data = await buildReportData(athlete.email, athlete.pageId);
    if (!data) return page("아직 WHOOP 수면 기록이 없어요. 선수가 연결한 뒤 기록이 쌓이면 보여요.");

    await logAccess({
      actor: myEmail, action: "view", resource: "WHOOP 리포트",
      target: { email: athlete.email, clientId: athlete.pageId }, path: `/coach/clients/${id}/whoop-report`,
    });

    const tpl = await readFile(path.join(process.cwd(), "report-assets", "whoop-report.html"), "utf8");
    const json = JSON.stringify(data).replace(/</g, "\\u003c"); // </script> 로 끊기지 않게
    return new NextResponse(tpl.replace("__DATA__", json), {
      headers: { "content-type": "text/html; charset=utf-8", "cache-control": "private, no-store" },
    });
  } catch (e) {
    console.error("whoop report failed:", e?.message);
    return page("리포트를 만들지 못했어요. 잠시 후 다시 시도해주세요.");
  }
}
