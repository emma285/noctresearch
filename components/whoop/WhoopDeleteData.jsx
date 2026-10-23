"use client";
// components/whoop/WhoopDeleteData.jsx — 코치 선수 상세 "배정 · 상태" 패널. 코칭 종료 + WHOOP 데이터 남아 있을 때만 표시.
// 삭제는 되돌릴 수 없으므로 확인 창을 거침. 종료 저장과 분리(코치가 직접 누름).
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function WhoopDeleteData({ athleteRef, athleteName }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function remove() {
    if (!window.confirm(`${athleteName} 선수의 WHOOP 데이터(수면·회복 기록)를 삭제합니다.\n삭제하면 복구할 수 없습니다. 설문·일지·세션 노트 등 코칭 자료는 그대로 남아요.`)) return;
    setBusy(true);
    try {
      const r = await fetch("/api/coach/whoop-delete", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ref: athleteRef }),
      });
      const j = await r.json().catch(() => ({}));
      if (!j.ok) alert(j.message || "삭제 실패");
      else router.refresh();
    } catch { alert("네트워크 오류"); }
    setBusy(false);
  }

  return (
    <div className="mt-3 bg-card border border-border rounded-2xl p-4">
      <div className="text-[13px] font-bold text-navy">WHOOP 데이터</div>
      <p className="text-[12.5px] text-muted-foreground mt-1.5 leading-relaxed">
        코칭이 종료됐어요. 개인정보처리방침에 따라 WHOOP 데이터를 삭제해 주세요.
      </p>
      <button type="button" onClick={remove} disabled={busy}
        className="w-full mt-3 py-3 rounded-xl border border-[#f1c9c4] text-[#c0392b] text-[14px] font-semibold active:opacity-80 disabled:opacity-60">
        {busy ? "삭제 중…" : "WHOOP 데이터 삭제"}
      </button>
    </div>
  );
}
