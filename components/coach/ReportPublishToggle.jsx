"use client";

// 코치가 선수 상세(/coach/athlete/[uid])에서 리포트 공개를 즉시 켜고 끄는 토글.
// 켜면 선수 포털의 "내 수면 리포트" 카드가 열린다. /api/coach/assign 부분 업데이트(reportPublished만).
import { useState } from "react";

export default function ReportPublishToggle({ uid, initial = false }) {
  const [on, setOn] = useState(initial === true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  async function toggle() {
    if (saving) return;
    const next = !on;
    setOn(next);
    setSaving(true);
    setMsg("");
    try {
      const res = await fetch("/api/coach/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid, reportPublished: next }),
      });
      const j = await res.json();
      if (j.success) {
        setMsg(next ? "선수에게 공개됨" : "비공개로 전환됨");
      } else {
        setOn(!next); // 롤백
        setMsg(j.message || "저장 실패");
      }
    } catch {
      setOn(!next);
      setMsg("네트워크 오류");
    }
    setSaving(false);
    setTimeout(() => setMsg(""), 2500);
  }

  const err = msg.includes("실패") || msg.includes("오류");

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14,
      background: "#fff", border: "1px solid #e6e7eb", borderRadius: 14, padding: "16px 20px",
      boxShadow: "0 1px 2px rgba(13,27,42,.05)", marginTop: 12 }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: "#0D1B2A" }}>리포트 선수에게 공개</div>
        <div style={{ fontSize: 12.5, color: "#6b7280", marginTop: 3, lineHeight: 1.5 }}>
          {on ? "선수 포털에서 리포트를 볼 수 있어요." : "켜면 선수 포털 “내 수면 리포트”가 열려요."}
          {msg && <span style={{ marginLeft: 8, color: err ? "#c0554a" : "#1f8a4c", fontWeight: 700 }}>{msg}</span>}
        </div>
      </div>
      <button type="button" role="switch" aria-checked={on} onClick={toggle} disabled={saving}
        style={{ position: "relative", flexShrink: 0, width: 52, height: 30, borderRadius: 999, border: "none",
          cursor: saving ? "wait" : "pointer", background: on ? "#4355B0" : "#cfd3dc", transition: "background .16s", padding: 0 }}>
        <span style={{ position: "absolute", top: 3, left: on ? 25 : 3, width: 24, height: 24, borderRadius: "50%",
          background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,.25)", transition: "left .16s" }} />
      </button>
    </div>
  );
}
