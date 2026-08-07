// app/api/prep/route.js
// 코칭 준비 자료(경기·원정/비행·훈련·메모 + 첨부) 제출 → Notion 저장 + 코치 슬랙 알림.
import { Client } from "@notionhq/client";
import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";

const notion = new Client({ auth: process.env.NOTION_API_KEY });
// 코칭 준비 자료는 인테이크(사전질문지) DB와 분리된 전용 DB에 저장.
const PREP_DB_ID = process.env.NOTION_PREP_DATABASE_ID || "3b5565bc034381aab23efdac3a6c6574";

async function getClerk() {
  return typeof clerkClient === "function" ? await clerkClient() : clerkClient;
}

async function notifyCoachSlack(name, email, items, files, origin, userId) {
  const url = process.env.SLACK_WEBHOOK_URL;
  if (!url) return;
  const text = [
    `*코칭 준비 자료 도착* — ${name}${email ? ` (${email})` : ""}`,
    ...items.map((it) => `• [${it.type}] ${it.text}`),
    ...files.map((f) => `첨부 · ${f.name}: ${origin}/api/coach/file?u=${encodeURIComponent(f.url)}`),
    userId ? `배정: ${origin}/coach/assign?uid=${userId}` : "",
  ].filter(Boolean).join("\n");
  await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) });
}

export async function POST(request) {
  try {
    const { items = [], files = [] } = await request.json();
    if (!items.length && !files.length) {
      return NextResponse.json({ success: false, message: "추가한 내용이 없어요." }, { status: 400 });
    }
    const origin = new URL(request.url).origin;
    const proxy = (u) => `${origin}/api/coach/file?u=${encodeURIComponent(u)}`;

    const { userId } = auth();
    let name = "선수", email = "";
    if (userId) {
      try {
        const cc = await getClerk();
        const u = await cc.users.getUser(userId);
        name = u?.unsafeMetadata?.name || u?.firstName || u?.username || "선수";
        email = u?.emailAddresses?.[0]?.emailAddress || "";
        await cc.users.updateUserMetadata(userId, {
          publicMetadata: { prepDone: true, prepAt: new Date().toISOString() },
        });
      } catch (e) { console.error("clerk lookup failed:", e?.message); }
    }

    // Notion 저장 (athlete DB에 [코칭준비] 페이지)
    if (process.env.NOTION_API_KEY) {
      const h2 = (t) => ({ object: "block", type: "heading_2", heading_2: { rich_text: [{ text: { content: t } }] } });
      const bullet = (t, link) => ({ object: "block", type: "bulleted_list_item", bulleted_list_item: { rich_text: [{ text: { content: String(t).slice(0, 2000), ...(link ? { link: { url: link } } : {}) } }] } });
      const blocks = [];
      const byType = {};
      items.forEach((it) => { (byType[it.type] = byType[it.type] || []).push(it.text); });
      for (const [type, arr] of Object.entries(byType)) {
        blocks.push(h2(type));
        arr.forEach((t) => blocks.push(bullet(t)));
      }
      if (files.length) {
        blocks.push(h2("첨부 파일"));
        files.forEach((f) => blocks.push(bullet(f.name, proxy(f.url))));
      }
      const props = {
        "이름": { title: [{ text: { content: name } }] },
        "제출일": { date: { start: new Date().toISOString().split("T")[0] } },
        "항목 수": { number: items.length },
        "첨부 수": { number: files.length },
      };
      if (email) props["이메일"] = { email };
      await notion.pages.create({
        parent: { database_id: PREP_DB_ID },
        properties: props,
        children: blocks.slice(0, 100),
      });
    }

    await notifyCoachSlack(name, email, items, files, new URL(request.url).origin, userId);
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("prep submit failed:", e?.message);
    return NextResponse.json({ success: false, message: e?.message || "저장 실패" }, { status: 500 });
  }
}
