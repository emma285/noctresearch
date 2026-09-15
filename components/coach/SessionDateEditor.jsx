"use client";
// 세션 목록에서 회차별 날짜/시각을 인라인 편집. 날짜·시각·시간대 칸이 항상 보임 → 고르면 '저장' 노출.
// 시간대(tz)를 골라 "그 지역 벽시계"로 입력 → 실제 인스턴트(UTC)로 저장. 해외 세션도 정확.
// 세션 행 session_at에 직접 저장(다음 세션이면 마스터 nextSession도 동기화).
import { useState } from "react";
import { useRouter } from "next/navigation";
import { wallToUtcMs, wallInTz, HOME_TZ } from "../../lib/tz";

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINS = ["00", "15", "30", "45"];
const pad = (n) => String(n).padStart(2, "0");
const hourLabel = (h) => (h === 0 ? "0시(자정)" : h < 12 ? `오전 ${h}시` : h === 12 ? "정오 12시" : `오후 ${h - 12}시`);
// 코치가 자주 쓰는 시간대 (지역 라벨)
const TZS = [
  ["Asia/Seoul", "한국"],
  ["America/New_York", "미국 동부"],
  ["America/Chicago", "미국 중부"],
  ["America/Denver", "미국 산악"],
  ["America/Los_Angeles", "미국 서부"],
  ["Europe/London", "영국"],
  ["Asia/Tokyo", "일본"],
];

export default function SessionDateEditor({ sessionId, initialISO, initialTs, defaultTz }) {
  const router = useRouter();
  const startTz = TZS.some(([z]) => z === defaultTz) ? defaultTz : HOME_TZ;
  const [tz, setTz] = useState(startTz);
  // 프리필: 실제 인스턴트가 있으면 선택 tz 벽시계로, 없으면 initialISO(한국 벽시계) 폴백.
  const initMs = initialTs ? Date.parse(initialTs) : NaN;
  const w = !isNaN(initMs) ? wallInTz(initMs, startTz) : null;
  const km = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(initialISO || "");
  const initDate = w ? w.date : (km ? `${km[1]}-${km[2]}-${km[3]}` : "");
  const initHour = w ? String(Math.floor(w.min / 60)) : (km ? String(+km[4]) : "10");
  const initMin = w ? pad(w.min % 60) : (km ? km[5] : "00");
  const [date, setDate] = useState(initDate);
  const [hour, setHour] = useState(initHour);
  const [min, setMin] = useState(initMin);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  // 폼값(날짜/시각/tz)이 처음 값과 다르면 '저장' 노출.
  const curKey = date ? `${date}T${pad(+hour)}:${min}@${tz}` : "";
  const origKey = initDate ? `${initDate}T${pad(+initHour)}:${initMin}@${startTz}` : "";
  const dirty = curKey !== origKey;

  async function save(clear) {
    setBusy(true); setSaved(false);
    let sessionAt = "";
    if (!clear && date) {
      const ms = wallToUtcMs(date, +hour * 60 + +min, tz); // 그 tz 벽시계 → 실제 인스턴트
      if (ms == null) { alert("시각 변환 실패"); setBusy(false); return; }
      sessionAt = new Date(ms).toISOString(); // UTC ISO (…Z)
    }
    try {
      const r = await fetch("/api/coach/session-date", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, sessionAt }),
      });
      const j = await r.json();
      if (j.success) {
        if (clear) { setDate(""); setHour("10"); setMin("00"); setTz(startTz); }
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
      <select value={tz} onChange={(e) => setTz(e.target.value)} className={inp} disabled={!date} title="입력한 시각이 어느 지역 기준인지">
        {TZS.map(([z, label]) => <option key={z} value={z}>{label} 기준</option>)}
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
