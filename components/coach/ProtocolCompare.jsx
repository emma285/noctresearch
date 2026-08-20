"use client";
// 코치 · 프로토콜 비교 목표 관리. 부가자료(프로토콜 타임테이블)를 골라 비교에 적용/해제.
// 적용 = 그 자료의 목표(취침/기상)를 sleep_targets에 넣음 → 로그 타임라인 "프로토콜 비교" 오버레이에 뜸.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Target, Check } from "lucide-react";

export default function ProtocolCompare({ clientId, protocols = [], applied = [] }) {
  const router = useRouter();
  const [busy, setBusy] = useState("");
  const appliedSet = new Set(applied);

  async function toggle(slug, on) {
    setBusy(slug);
    try {
      const r = await fetch("/api/coach/targets", {
        method: on ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, slug }),
      });
      const j = await r.json().catch(() => ({}));
      if (j.success) router.refresh();
      else alert(j.message || "실패했어요.");
    } catch { alert("네트워크 오류"); }
    setBusy("");
  }

  if (!protocols.length) {
    return <div className="p-4 text-[12.5px] text-muted-foreground leading-relaxed">비교 가능한 프로토콜이 없어요. 프로토콜 타임테이블 부가자료(취침·기상 목표 포함)를 추가하면 여기서 비교에 적용할 수 있어요.</div>;
  }

  return (
    <div className="divide-y divide-[#eef0f3]">
      {protocols.map((p) => {
        const on = appliedSet.has(p.slug);
        return (
          <div key={p.slug} className="flex items-center gap-3 p-4">
            <span className={`w-8 h-8 rounded-lg flex items-center justify-center flex-none ${on ? "bg-primary/10 text-primary" : "bg-[#eef0f3] text-[#9aa0ab]"}`}>
              {on ? <Check className="w-4 h-4" strokeWidth={3} /> : <Target className="w-4 h-4" />}
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-[14px] font-bold text-navy truncate">{p.label}</div>
              <div className="text-[12px] text-muted-foreground">{p.targetCount}일치 목표{on ? " · 비교 중" : ""}</div>
            </div>
            <button type="button" onClick={() => toggle(p.slug, on)} disabled={busy === p.slug}
              className={`text-[12.5px] font-bold px-3 py-1.5 rounded-lg whitespace-nowrap disabled:opacity-50 ${on ? "border border-[#e6c7c1] text-[#c0554a] bg-white" : "bg-primary text-white"}`}>
              {busy === p.slug ? "…" : on ? "해제" : "비교에 적용"}
            </button>
          </div>
        );
      })}
    </div>
  );
}
