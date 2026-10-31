"use client";
// 아직 진행 안 한 세션(노트·공개 없음) 삭제. 확인창 후 Neon 행 삭제 → 목록 새로고침.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

export default function DeleteSessionButton({ sessionId, n }) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function del() {
    if (!confirm(`${n ?? ""}회차 세션을 삭제할까요? 되돌릴 수 없어요.`)) return;
    setBusy(true);
    try {
      const r = await fetch("/api/coach/session-delete", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const j = await r.json();
      if (j.success) router.refresh();
      else alert(j.message || "삭제 실패");
    } catch { alert("네트워크 오류"); }
    setBusy(false);
  }

  return (
    <button type="button" onClick={del} disabled={busy} title="세션 삭제"
      className="p-1.5 rounded-lg text-[#9298a2] hover:text-[#d14343] hover:bg-[#fdeeee] disabled:opacity-50 flex-none">
      <Trash2 className="w-4 h-4" />
    </button>
  );
}
