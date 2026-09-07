"use client";
// 세션 목록에서 회차별 날짜를 인라인으로 편집. 날짜/시각 입력칸이 항상 보임 → 고르면 '저장' 노출.
// 세션 행 session_at에 직접 저장(다음 세션이면 마스터 nextSession도 동기화).
import { useState } from "react";
import { useRouter } from "next/navigation";

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINS = ["00", "15", "30", "45"];
const pad = (n) => String(n).padStart(2, "0");
const hourLabel = (h) => (h === 0 ? "0시(자정)" : h < 12 ? `오전 ${h}시` : h === 12 ? "정오 12시" : `오후 ${h - 12}시`);

export default function SessionDateEditor({ sessionId, initialISO }) {
  const router = useRouter();
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(initialISO || "");
  const [date, setDate] = useState(m ? `${m[1]}-${m[2]}-${m[3]}` : "");
  const [hour, setHour] = useState(m ? String(+m[4]) : "10");
  const [min, setMin] = useState(m ? m[5] : "00");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  // 폼값이 처음 값과 다르면 '저장' 노출.
  const curKey = date ? `${date}T${pad(+hour)}:${min}` : "";
  const origKey = m ? `${m[1]}-${m[2]}-${m[3]}T${pad(+m[4])}:${m[5]}` : "";
  const dirty = curKey !== origKey;

  async function save(clear) {
    setBusy(true); setSaved(false);
    const sessionAt = clear || !date ? "" : `${date}T${pad(+hour)}:${min}:00+09:00`;
    try {
      const r = await fetch("/api/coach/session-date", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, sessionAt }),
      });
      const j = await r.json();
      if (j.success) {
        if (clear) { setDate(""); setHour("10"); setMin("00"); }
        setSaved(true); setTimeout(() => setSaved(false), 1800); router.refresh();
      } else alert(j.message || "저장 실패");
    } catch { alert("네트워크 오류"); }
    setBusy(false);
  }

  const inp = "rounded-lg border border-[#d9dce1] px-2 py-1 text-[12.5px] bg-white focus:outline-none focus:border-primary";
  return (
    <div className="mt-1 flex flex-wrap items-center gap-1.5">
      <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inp} />
      <select value={hour} onChange={(e) => setHour(e.target.value)} className={inp} disabled={!date}>
        {HOURS.map((h) => <option key={h} value={h}>{hourLabel(h)}</option>)}
      </select>
      <select value={min} onChange={(e) => setMin(e.target.value)} className={inp} disabled={!date}>
        {MINS.map((mm) => <option key={mm} value={mm}>{mm}분</option>)}
      </select>
      {dirty
        ? <button type="button" onClick={() => save(false)} disabled={busy}
            className="text-[11.5px] font-bold px-2.5 py-1 rounded-lg bg-primary text-white disabled:opacity-50">{busy ? "저장 중…" : "저장"}</button>
        : saved
          ? <span className="text-[11.5px] font-bold text-[#1f8a4c]">저장됨 ✓</span>
          : null}
      {initialISO && !dirty
        ? <button type="button" onClick={() => save(true)} disabled={busy} className="text-[11px] px-1.5 py-1 rounded-lg text-[#9298a2] hover:text-[#6b7280]">지우기</button>
        : null}
    </div>
  );
}
