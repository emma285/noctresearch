"use client";

// 코치가 특정 리포트(slug)를 선수에게 공개/비공개하는 컴팩트 토글.
// 켜면 선수 포털에 해당 리포트 카드가 열린다. /api/coach/publish-report 호출(리포트별 상태).
import { useState } from "react";

export default function ReportPublishToggle({ uid, slug, initialOn = false }) {
  const [on, setOn] = useState(initialOn === true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  async function toggle() {
    if (saving) return;
    const next = !on;
    setOn(next);
    setSaving(true);
    setMsg("");
    try {
      const res = await fetch("/api/coach/publish-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid, slug, on: next }),
      });
      const j = await res.json();
      if (j.success) setMsg(next ? "공개됨" : "비공개");
      else { setOn(!next); setMsg(j.message || "실패"); }
    } catch { setOn(!next); setMsg("오류"); }
    setSaving(false);
    setTimeout(() => setMsg(""), 2500);
  }

  const err = msg.includes("실패") || msg.includes("오류");

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
      {msg && <span style={{ fontSize: 12, fontWeight: 700, color: err ? "#c0554a" : "#1f8a4c" }}>{msg}</span>}
      <span style={{ fontSize: 12.5, fontWeight: 700, color: on ? "#4355B0" : "#9aa3ad" }}>
        {on ? "선수 공개" : "비공개"}
      </span>
      <button type="button" role="switch" aria-checked={on} onClick={toggle} disabled={saving}
        aria-label="리포트 선수 공개 토글"
        style={{ position: "relative", flexShrink: 0, width: 48, height: 28, borderRadius: 999, border: "none",
          cursor: saving ? "wait" : "pointer", background: on ? "#4355B0" : "#cfd3dc", transition: "background .16s", padding: 0 }}>
        <span style={{ position: "absolute", top: 3, left: on ? 23 : 3, width: 22, height: 22, borderRadius: "50%",
          background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,.25)", transition: "left .16s" }} />
      </button>
    </div>
  );
}
