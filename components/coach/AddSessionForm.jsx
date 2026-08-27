"use client";
// 코치가 회차를 직접 지정해 세션 추가 (0.5 단위 허용 · 예: 1.5 중간 점검).
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AddSessionForm({ clientId, defaultN }) {
  const [n, setN] = useState(defaultN != null ? String(defaultN) : "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const router = useRouter();

  async function add() {
    setErr("");
    const num = Number(n);
    if (!Number.isFinite(num) || num <= 0 || (num * 2) % 1 !== 0) { setErr("0.5 단위 양수 (예: 1.5)"); return; }
    setBusy(true);
    try {
      const res = await fetch("/api/coach/session-create", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, n: num }),
      });
      const j = await res.json();
      if (!j.success) { setErr(j.message || "실패"); setBusy(false); return; }
      setN("");
      router.refresh();
    } catch { setErr("네트워크 오류"); }
    setBusy(false);
  }

  return (
    <div className="flex items-center gap-2 px-4 py-3 border-t border-[#e7e9ed]">
      <span className="text-[12.5px] text-[#9298a2] font-semibold flex-none">회차 추가</span>
      <input
        type="number" step="0.5" min="0.5" value={n}
        onChange={(e) => setN(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") add(); }}
        placeholder="예: 1.5"
        className="w-24 text-[13px] rounded-lg border border-[#d9dce1] px-2.5 py-1.5 focus:outline-none focus:border-primary"
      />
      <button onClick={add} disabled={busy}
        className="text-[12px] font-bold px-2.5 py-1.5 rounded-lg bg-primary text-white disabled:opacity-50 whitespace-nowrap">
        {busy ? "추가 중…" : "세션 추가"}
      </button>
      {err && <span className="text-[11.5px] text-red-500">{err}</span>}
    </div>
  );
}
