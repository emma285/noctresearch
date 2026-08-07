// lib/notify.js — 코칭 알림을 Slack #코칭 채널로 (봇 chat.postMessage). 실패/미설정 시 웹훅 폴백.
export async function notifyCoaching(text) {
  const token = process.env.SLACK_BOT_TOKEN;
  const channel = process.env.SLACK_COACHING_CHANNEL;
  if (token && channel) {
    try {
      const res = await fetch("https://slack.com/api/chat.postMessage", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({ channel, text }),
      });
      const j = await res.json().catch(() => ({}));
      if (j?.ok) return;
      console.error("slack bot post not ok:", j?.error);
    } catch (e) {
      console.error("slack bot post failed:", e?.message);
    }
  }
  // 폴백 — 기존 웹훅
  const webhook = process.env.SLACK_WEBHOOK_URL;
  if (webhook) {
    try {
      await fetch(webhook, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) });
    } catch (e) {
      console.error("slack webhook fallback failed:", e?.message);
    }
  }
}
