"use client";
// 루틴 기록 (기록 탭 /log/routine) — 상단 타입메뉴 + 세로 타임라인 + 추가 시트. 하단 4탭 유지.
// 블록마다 kind="routine", data={time,type,detail,dur,text} 저장(기존 데이터 모델 동일).
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, X, Trash2 } from "lucide-react";
import { cn } from "../../lib/utils";
import BottomNav from "./BottomNav";
import { TYPES, ORDER } from "./routineTypes";

const kstToday = () => new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
const round15 = (m) => (Math.round(m / 15) * 15) % 1440; // 가장 가까운 0/15/30/45분
const nowMin = () => { const n = new Date(Date.now() + 9 * 3600 * 1000); return round15(n.getUTCHours() * 60 + n.getUTCMinutes()); };
const fmt = (m) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
const hint = (m) => { const h = Math.floor(m / 60), mm = m % 60; const period = h < 5 ? "새벽" : h < 11 ? "아침" : h < 18 ? "오후" : "밤"; let hh = h % 12; if (hh === 0) hh = 12; return `${period} ${hh}시 ${String(mm).padStart(2, "0")}분`; };
const tmin = (t) => { const [h, m] = String(t || "0:0").split(":").map(Number); return h * 60 + m; };

function Chip({ on, children, onClick }) {
  return <button type="button" onClick={onClick} className={cn("px-3.5 py-2 rounded-lg text-sm font-medium border transition-colors", on ? "bg-primary/10 border-primary text-primary" : "bg-card border-border text-foreground")}>{children}</button>;
}
function TimePicker({ value, onChange }) {
  const step = (d) => onChange((value + d + 1440) % 1440);
  const B = ({ d, children }) => <button type="button" onClick={() => step(d)} className="w-11 h-11 rounded-xl border border-border text-muted-foreground active:bg-muted text-[15px]">{children}</button>;
  return (
    <div className="flex flex-col items-center">
      <div className="flex items-center gap-2">
        <B d={-60}>−1h</B><B d={-15}>−15</B>
        <div className="text-[30px] font-bold tabular-nums w-[104px] text-center">{fmt(value)}</div>
        <B d={15}>+15</B><B d={60}>+1h</B>
      </div>
      <div className="text-[13px] text-muted-foreground mt-2.5">{hint(value)}</div>
    </div>
  );
}

export default function RoutineLog({ email }) {
  const router = useRouter();
  const [blocks, setBlocks] = useState([]);
  const [sheet, setSheet] = useState(null);
  const [time, setTime] = useState(21 * 60);
  const [detail, setDetail] = useState(null);
  const [dur, setDur] = useState(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`/api/log?user=${encodeURIComponent(email)}&month=${kstToday().slice(0, 7)}`);
        const j = await r.json();
        const bl = j.days?.[kstToday()]?.blocks || [];
        setBlocks(bl.map((b) => ({ nid: b.nid, time: b.time, type: b.type, detail: b.detail, dur: b.dur, text: b.text })));
      } catch {}
    })();
  }, [email]);

  const open = (k) => { setSheet(k); setTime(nowMin()); setDetail(null); setDur(null); setText(""); };
  const close = () => setSheet(null);

  async function add() {
    const T = TYPES[sheet];
    setBusy(true);
    const data = { time: fmt(time), type: sheet, detail, dur, text: text || undefined };
    const summary = [T.label, detail, dur, text].filter(Boolean).join(" · ");
    try {
      const r = await fetch("/api/log", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ user: email, kind: "routine", date: kstToday(), summary, data }) });
      const j = await r.json();
      setBlocks((b) => [...b, { nid: j.id, ...data }]);
    } catch {}
    setBusy(false); close();
  }
  async function remove(nid) {
    if (!window.confirm("이 기록을 삭제할까요?")) return;
    setBlocks((b) => b.filter((x) => x.nid !== nid));
    try { await fetch("/api/log", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: nid }) }); } catch {}
  }

  const sorted = [...blocks].sort((a, b) => tmin(a.time) - tmin(b.time));
  const T = sheet ? TYPES[sheet] : null;
  const SheetIcon = T?.icon;

  return (
    <div className="h-[100dvh] flex flex-col bg-background mx-auto w-full max-w-[430px] pb-[76px]">
      {/* header */}
      <div className="px-4 pt-[calc(env(safe-area-inset-top)+14px)] pb-3 flex items-center gap-3">
        <button onClick={() => router.push("/log")} className="w-9 h-9 -ml-1.5 rounded-lg flex items-center justify-center active:bg-muted"><ChevronLeft className="w-6 h-6" /></button>
        <h1 className="text-[20px] font-bold tracking-[-0.3px]">루틴 기록</h1>
      </div>

      {/* 상단 타입 메뉴 */}
      <div className="px-4 pb-3">
        <div className="flex justify-between gap-1">
          {ORDER.map((k) => { const t = TYPES[k]; const Ic = t.icon; return (
            <button key={k} onClick={() => open(k)} className="flex flex-col items-center gap-1.5 flex-1 active:opacity-70">
              <span className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: t.bg, color: t.color }}><Ic className="w-5 h-5" strokeWidth={2} /></span>
              <span className="text-[11px] font-medium text-muted-foreground">{t.label}</span>
            </button>
          ); })}
        </div>
      </div>

      {/* 세로 타임라인 */}
      <div className="flex-1 overflow-y-auto px-5 pt-2 pb-4 border-t border-border">
        {sorted.length === 0 ? (
          <div className="text-center text-muted-foreground text-sm py-16 leading-relaxed">아직 기록이 없어요.<br />위 메뉴에서 오늘 일과를 추가하세요.</div>
        ) : (
          <div className="pt-2">
            {sorted.map((b, i) => {
              const t = TYPES[b.type] || TYPES.etc; const Ic = t.icon;
              const sub = [b.detail, b.dur, b.text].filter(Boolean).join(" · ");
              const isLast = i === sorted.length - 1;
              return (
                <div key={b.nid} className="flex gap-3">
                  <div className="w-11 shrink-0 text-right text-[13px] font-semibold text-muted-foreground pt-3.5 tabular-nums">{b.time}</div>
                  {/* rail: 세로선 + 노드 */}
                  <div className="relative w-3 shrink-0 flex justify-center">
                    <div className={cn("absolute w-0.5 bg-border left-1/2 -translate-x-1/2 top-0", isLast ? "h-[26px]" : "bottom-0")} />
                    <div className="relative z-10 w-3 h-3 rounded-full mt-[15px] ring-4 ring-background" style={{ background: t.color }} />
                  </div>
                  <div className="flex-1 pb-4 min-w-0">
                    <div className="flex items-center gap-3 bg-card border border-border rounded-xl p-3">
                      <span className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: t.bg, color: t.color }}><Ic className="w-[18px] h-[18px]" strokeWidth={2} /></span>
                      <div className="flex-1 min-w-0"><div className="text-[15px] font-semibold text-foreground">{t.label}</div>{sub ? <div className="text-[13px] text-muted-foreground mt-0.5 truncate">{sub}</div> : null}</div>
                      <button onClick={() => remove(b.nid)} className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground active:bg-muted shrink-0"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <BottomNav />

      {/* 추가 입력 — 화면 중앙 모달 (메뉴가 위에 있어 손 이동 최소화) */}
      {sheet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-5">
          <div className="absolute inset-0 bg-black/40" onClick={close} />
          <div className="relative w-full max-w-[350px] bg-card rounded-2xl p-5 max-h-[85vh] overflow-y-auto shadow-[0_24px_64px_rgba(13,27,42,.28)]">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: T.bg, color: T.color }}>{SheetIcon ? <SheetIcon className="w-[18px] h-[18px]" /> : null}</span>
                <span className="text-[17px] font-bold">{T.label}</span>
              </div>
              <button onClick={close} className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground active:bg-muted"><X className="w-5 h-5" /></button>
            </div>
            <div className="text-[13px] font-semibold text-muted-foreground mb-3">시각</div>
            <TimePicker value={time} onChange={setTime} />
            {T.opts ? (<div className="mt-6"><div className="text-[13px] font-semibold text-muted-foreground">{T.detailLb}</div><div className="flex flex-wrap gap-2 mt-2.5">{T.opts.map((o) => <Chip key={o} on={detail === o} onClick={() => setDetail(o)}>{o}</Chip>)}</div></div>) : null}
            {T.textLb ? (<div className="mt-6"><div className="text-[13px] font-semibold text-muted-foreground">{T.textLb}</div><textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} placeholder={T.textPh} className="w-full mt-2.5 rounded-xl border border-border bg-background p-3 text-[15px] resize-none focus:outline-none focus:border-primary" /></div>) : null}
            {T.durOpts ? (<div className="mt-6"><div className="text-[13px] font-semibold text-muted-foreground">{T.durLb}</div><div className="flex flex-wrap gap-2 mt-2.5">{T.durOpts.map((o) => <Chip key={o} on={dur === o} onClick={() => setDur(o)}>{o}</Chip>)}</div></div>) : null}
            <button onClick={add} disabled={busy} className="w-full bg-primary text-white text-base font-semibold py-3.5 rounded-xl active:opacity-90 disabled:opacity-60 mt-7">{busy ? "추가 중…" : "타임라인에 추가"}</button>
          </div>
        </div>
      )}
    </div>
  );
}
