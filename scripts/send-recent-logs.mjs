// 지수·이나 최근 이틀치 슬립로그를 슬랙 #코칭에 (실 알림과 동일 포맷)로 전송.
import fs from "node:fs";
import path from "node:path";

// .env.local 로드
const envPath = path.join(process.cwd(), ".env.local");
for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const { neon } = await import("@neondatabase/serverless");
const sql = neon(process.env.DATABASE_URL);

async function slack(text) {
  const res = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`, "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ channel: process.env.SLACK_COACHING_CHANNEL, text }),
  });
  return res.json();
}

const targets = ["지수", "이나"];
for (const key of targets) {
  const clients = await sql`select email, name from clients where name like ${"%" + key + "%"}`;
  if (!clients.length) { console.log(`no client for ${key}`); continue; }
  const c = clients[0];
  const rows = await sql`
    select to_char(date, 'YYYY-MM-DD') as date, summary, data from logs
    where user_email = ${c.email} and kind = 'sleep'
    order by date desc limit 2`;
  console.log(`=== ${c.name} (${c.email}) — ${rows.length}건 ===`);
  // 오래된→최신 순으로 보내기
  for (const r of rows.reverse()) {
    const who = c.name || c.email;
    const summary = r.summary || "";
    const memo = ((r.data && r.data.memo) || "").trim();
    const text = `🌙 *슬립로그 도착* — ${who}\n${r.date}${summary ? `\n${summary}` : ""}${memo ? `\n📝 메모: ${memo}` : ""}`;
    if (process.env.DRY) { console.log("---- preview ----\n" + text + "\n"); continue; }
    const j = await slack(text);
    console.log(r.date, j.ok ? "sent" : "FAIL:" + j.error, memo ? "(메모O)" : "(메모X)");
  }
}
