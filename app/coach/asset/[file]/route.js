// 코치 전용 파일 서버 — coach-assets/ 의 HTML(코치가이드·선수데이터 등)을 코치 로그인 상태에서만 서빙.
// 예: /coach/asset/yuna-guide.html  ·  /coach/asset/yuna-data.html
import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { isCoachEmail } from "../../../../lib/coach";

export const runtime = "nodejs";

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".css": "text/css; charset=utf-8",
};

async function getClerk() {
  return typeof clerkClient === "function" ? await clerkClient() : clerkClient;
}

export async function GET(_request, { params }) {
  try {
    const { userId } = auth();
    if (!userId) return new NextResponse("로그인이 필요해요.", { status: 401 });
    const cc = await getClerk();
    const me = await cc.users.getUser(userId);
    const email = me?.emailAddresses?.[0]?.emailAddress;
    if (!isCoachEmail(email)) return new NextResponse("코치만 볼 수 있어요.", { status: 403 });

    // 경로 순회 방지 — 파일명만 허용
    const raw = String(params?.file || "");
    const name = path.basename(raw);
    if (name !== raw || name.includes("..")) return new NextResponse("잘못된 파일명이에요.", { status: 400 });
    const ext = path.extname(name).toLowerCase();
    if (!TYPES[ext]) return new NextResponse("허용되지 않은 형식이에요.", { status: 400 });

    const filePath = path.join(process.cwd(), "coach-assets", name);
    let buf;
    try {
      buf = await readFile(filePath);
    } catch {
      return new NextResponse("파일을 찾을 수 없어요.", { status: 404 });
    }

    return new NextResponse(buf, {
      status: 200,
      headers: { "Content-Type": TYPES[ext], "Cache-Control": "private, max-age=60" },
    });
  } catch (e) {
    return new NextResponse("오류: " + (e?.message || "unknown"), { status: 500 });
  }
}
