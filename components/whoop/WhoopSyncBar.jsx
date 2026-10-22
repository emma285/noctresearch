"use client";
// components/whoop/WhoopSyncBar.jsx — 코치 WHOOP 패널 상단: 마지막 확인 시각(자동/직접) + [지금 동기화] (/api/coach/whoop-sync).
// 마지막 확인이 26시간 넘게 지나면(매일 12:00 자동 확인이 안 돈 것) 빨간색 경고.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Loader2 } from "lucide-react";

const STALE_MS = 26 * 60 * 60 * 1000; // 하루 + cron 지연 여유
const SOURCE = { auto: "자동", manual: "직접" };

function fmt(iso, withTime = true) {
  if (!iso) return "";
  const d = new Date(iso);
  const p = Object.fromEntries(new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul", month: "numeric", day: "numeric", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(d).map((x) => [x.type, x.value]));
  return withTime ? `${p.month}/${p.day}(${p.weekday}) ${p.hour}:${p.minute}` : `${p.month}/${p.day}`;
}

function resultText(r) {
  if (!r) return "";
  if (r.ok) {
    if (r.added > 0) return `새 기록 ${r.added}건을 가져왔어요.`;
    return `새 기록이 없어요.${r.latestSleepEnd ? ` (가장 최근 수면: ${fmt(r.latestSleepEnd, false)})` : ""}`;
  }
  if (r.reason === "needs_reauth" || r.reason === "not_connected") return "WHOOP 연결에 문제가 있어요. 선수에게 재연결을 요청해 주세요.";
  return "동기화에 실패했어요. 잠시 후 다시 시도해주세요.";
}

export default function WhoopSyncBar({ athleteRef, lastCheckedAt, lastCheckSource }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const stale = lastCheckedAt && Date.now() - new Date(lastCheckedAt).getTime() > STALE_MS;

  async function onClick() {
    setBusy(true);
    try {
      const res = await fetch("/api/coach/whoop-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ref: athleteRef }),
      });
      setResult(await res.json().catch(() => ({ ok: false })));
      router.refresh();
    } catch {
      setResult({ ok: false });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="px-4 py-2.5 border-b border-[#e7e9ed]">
      <div className="flex items-center justify-between gap-3">
        <div className={`text-[12px] font-semibold ${stale ? "text-[#c0392b]" : "text-[#6b7280]"}`}>
          마지막 확인: {lastCheckedAt ? `${fmt(lastCheckedAt)} · ${SOURCE[lastCheckSource] || "자동"}` : "아직 없음"}
          {stale ? " · 자동 확인이 안 되고 있어요" : ""}
        </div>
        <button type="button" onClick={onClick} disabled={busy}
          className="inline-flex items-center gap-1.5 text-[12px] font-bold text-[#3a3f48] border border-[#d9dce1] rounded-lg px-2.5 py-1.5 bg-white disabled:opacity-60 whitespace-nowrap">
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          {busy ? "확인 중…" : "지금 동기화"}
        </button>
      </div>
      {result ? <div className={`mt-1.5 text-[12px] font-semibold ${result.ok ? "text-primary" : "text-[#c0392b]"}`}>{resultText(result)}</div> : null}
    </div>
  );
}
