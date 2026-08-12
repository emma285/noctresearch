"use client";
// 코치 배정 폼 — 다음 세션·프로그램·상태를 마스터 DB에 직접 저장. (/coach/clients/[email])
// 코치 액션의 단일 소스를 마스터로 통일.
import { useState } from "react";
import { useRouter } from "next/navigation";

const PROGRAMS = ["3주 수면 리셋", "8주 수면 셋업", "수면 케어"];
const STATUSES = ["초대됨", "로그인", "intake제출", "리포트게시", "온보딩완료", "진행중", "종료"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINS = ["00", "15", "30", "45"];
const pad = (n) => String(n).padStart(2, "0");
const hourLabel = (h) => (h === 0 ? "0시(자정)" : h < 12 ? `${h}시(오전)` : h === 12 ? "12시(정오)" : `${h}시(오후)`);

export default function CoachManageForm({ athlete }) {
  const router = useRouter();
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(athlete.nextSession || "");
  const [date, setDate] = useState(m ? `${m[1]}-${m[2]}-${m[3]}` : "");
  const [hour, setHour] = useState(m ? String(+m[4]) : "10");
  const [min, setMin] = useState(m ? m[5] : "00");
  const [program, setProgram] = useState(athlete.program || "");
  const [status, setStatus] = useState(athlete.status || "진행중");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setSaving(true); setSaved(false);
    const nextSession = date ? `${date}T${pad(+hour)}:${min}:00+09:00` : "";
    try {
      const r = await fetch("/api/coach/master", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageId: athlete.pageId, nextSession, program, status }),
      });
      const j = await r.json();
      if (j.success) { setSaved(true); setTimeout(() => setSaved(false), 2000); router.refresh(); }
      else alert(j.message || "저장 실패");
    } catch { alert("네트워크 오류"); }
    setSaving(false);
  }

  const lbl = "text-[13px] font-bold text-navy mb-2";
  const sel = "rounded-xl border border-border bg-card px-3 py-2.5 text-[14px] focus:outline-none focus:border-primary";
  const chip = (active) => `px-3.5 py-2.5 rounded-xl text-[13.5px] font-semibold border transition-colors ${active ? "bg-primary/10 border-primary text-primary" : "bg-card border-border text-foreground"}`;

  return (
    <div className="bg-card border border-border rounded-2xl divide-y divide-border mt-2">
      {/* 다음 세션 */}
      <div className="p-4">
        <div className={lbl}>다음 세션</div>
        <div className="flex flex-wrap gap-2">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={sel + " flex-1 min-w-[130px]"} />
          <select value={hour} onChange={(e) => setHour(e.target.value)} className={sel}>{HOURS.map((h) => <option key={h} value={h}>{hourLabel(h)}</option>)}</select>
          <select value={min} onChange={(e) => setMin(e.target.value)} className={sel}>{MINS.map((mm) => <option key={mm} value={mm}>{mm}분</option>)}</select>
        </div>
        {date ? <button type="button" onClick={() => setDate("")} className="text-[12px] text-muted-foreground mt-2">일정 지우기</button> : null}
      </div>

      {/* 프로그램 */}
      <div className="p-4">
        <div className={lbl}>프로그램</div>
        <div className="flex flex-wrap gap-2">
          {PROGRAMS.map((p) => (
            <button key={p} type="button" onClick={() => setProgram(program === p ? "" : p)} className={chip(program === p)}>{p}</button>
          ))}
        </div>
      </div>

      {/* 상태 */}
      <div className="p-4">
        <div className={lbl}>코칭 상태</div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className={sel + " w-full"}>{STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}</select>
      </div>

      {/* 저장 */}
      <div className="p-4">
        <button type="button" onClick={save} disabled={saving}
          className="w-full bg-primary text-white text-[15px] font-semibold py-3 rounded-xl active:opacity-90 disabled:opacity-60">
          {saving ? "저장 중…" : saved ? "저장됨 ✓" : "저장"}
        </button>
      </div>
    </div>
  );
}
