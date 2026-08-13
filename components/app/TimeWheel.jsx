"use client";
// 시각 입력 휠 스피너 — 3컬럼(오전·오후 / 시 / 분). 분은 15분 단위(00·15·30·45).
// 시·분은 무한 루프(…11 12 1 2…, …45 00 15…). 오전/오후는 2개 토글.
// value = 자정 기준 분(0~1439), onChange(min). 스타일은 전부 인라인(styled-jsx FOUC 방지).
import { useRef, useEffect, useState } from "react";

const ROW = 54;              // 한 칸 높이
const AP = ["오전", "오후"];
const HRS = Array.from({ length: 12 }, (_, i) => i + 1); // 1~12
const MINS = [0, 15, 30, 45];

const clampMin = (m) => (((m % 1440) + 1440) % 1440);
function toParts(min) {
  const v = clampMin(min ?? 0);
  const h24 = Math.floor(v / 60);
  const ap = h24 < 12 ? 0 : 1;
  let h12 = h24 % 12; if (h12 === 0) h12 = 12;
  const mSnap = (Math.round((v % 60) / 15) * 15) % 60;
  const mi = MINS.indexOf(mSnap);
  return { ap, hi: HRS.indexOf(h12), mi: mi < 0 ? 0 : mi };
}
function toMin(ap, hi, mi) {
  const h12 = HRS[hi];               // 1~12
  const h24 = (h12 % 12) + ap * 12;  // 12→0, +오후
  return h24 * 60 + MINS[mi];
}

function Col({ base, index, onPick, width, render, loop }) {
  const L = base.length;
  const REPEAT = loop ? (L <= 4 ? 101 : 41) : 1;         // 무한 느낌용 반복 블록
  const MID = loop ? Math.floor(REPEAT / 2) * L : 0;      // 가운데 블록 시작 절대인덱스
  const items = loop ? Array.from({ length: L * REPEAT }, (_, k) => base[k % L]) : base;

  const ref = useRef(null);
  const inited = useRef(false);
  const raf = useRef(0);
  const settle = useRef(null);
  const recenter = useRef(null);
  const [liveAbs, setLiveAbs] = useState(MID + index);

  // 최초 부착 시 즉시 선택값 위치로 (snap 컨테이너는 useEffect보다 ref콜백이 확실)
  const attach = (el) => {
    ref.current = el;
    if (el && !inited.current) { inited.current = true; el.scrollTop = (MID + index) * ROW; }
  };

  // 외부 값 변경 시 위치 동기화
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const cur = Math.round(el.scrollTop / ROW);
    if (((cur % L) + L) % L !== index) {
      el.scrollTop = (MID + index) * ROW;
      setLiveAbs(MID + index);
    }
  }, [index]); // eslint-disable-line react-hooks/exhaustive-deps

  const onScroll = () => {
    const el = ref.current; if (!el) return;
    clearTimeout(recenter.current);
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => setLiveAbs(Math.round(el.scrollTop / ROW)));
    clearTimeout(settle.current);
    settle.current = setTimeout(() => {
      const el2 = ref.current; if (!el2) return;
      const raw = Math.max(0, Math.min(items.length - 1, Math.round(el2.scrollTop / ROW)));
      el2.scrollTo({ top: raw * ROW, behavior: "smooth" });
      const baseIdx = ((raw % L) + L) % L;
      if (baseIdx !== index) onPick(baseIdx);
      // 스냅 뒤 가운데 블록으로 조용히 리센터 → 끝에 안 닿고 계속 돌게 (같은 값이라 무보임)
      if (loop) {
        recenter.current = setTimeout(() => {
          const el3 = ref.current; if (!el3) return;
          const want = MID + baseIdx;
          if (Math.round(el3.scrollTop / ROW) !== want) { el3.scrollTop = want * ROW; setLiveAbs(want); }
        }, 300);
      }
    }, 120);
  };

  const colStyle = {
    width, height: ROW * 3, overflowY: "scroll", scrollSnapType: "y mandatory",
    WebkitOverflowScrolling: "touch", scrollbarWidth: "none", msOverflowStyle: "none",
    overscrollBehavior: "contain", touchAction: "pan-y",
    position: "relative", zIndex: 1, textAlign: "center",
  };
  return (
    <div className="tw-col" ref={attach} onScroll={onScroll} style={colStyle}>
      <div style={{ height: ROW }} />
      {items.map((it, k) => {
        const on = k === liveAbs;
        return (
          <div key={k} style={{
            height: ROW, lineHeight: `${ROW}px`, scrollSnapAlign: "center",
            fontVariantNumeric: "tabular-nums", fontWeight: 700, fontSize: 24,
            color: on ? "#0D1B2A" : "#aeb4c0",
            transition: "color .12s",
          }}>
            {render ? render(it) : it}
          </div>
        );
      })}
      <div style={{ height: ROW }} />
    </div>
  );
}

// 데스크탑(마우스) 여부 — 데스크탑은 휠 대신 드롭다운(스크롤 전용 휠이 불편)
function useIsDesktop() {
  const [desktop, setDesktop] = useState(false); // SSR/최초=휠(모바일 기준), 마운트 후 보정
  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    const on = () => setDesktop(mq.matches);
    on();
    mq.addEventListener?.("change", on);
    return () => mq.removeEventListener?.("change", on);
  }, []);
  return desktop;
}

// 데스크탑용 드롭다운 — 시(0~23) + 분(15분 단위). value/onChange는 휠과 동일(자정 기준 분)
const hourLabelD = (h) => (h === 0 ? "오전 12시" : h < 12 ? `오전 ${h}시` : h === 12 ? "오후 12시" : `오후 ${h - 12}시`);
function TimeDropdown({ value, onChange }) {
  const v = clampMin(value);
  const h = Math.floor(v / 60);
  const m = (Math.round((v % 60) / 15) * 15) % 60;
  const sel = "px-4 py-3 rounded-xl border-2 border-gray-200 bg-white text-sm outline-none focus:border-[#4355B0] transition-colors";
  return (
    <div className="flex gap-3 justify-center py-2">
      <select value={h} onChange={(e) => onChange(Number(e.target.value) * 60 + m)} className={sel + " flex-1 max-w-[180px]"}>
        {Array.from({ length: 24 }, (_, i) => i).map((hh) => <option key={hh} value={hh}>{hourLabelD(hh)}</option>)}
      </select>
      <select value={m} onChange={(e) => onChange(h * 60 + Number(e.target.value))} className={sel + " w-24"}>
        {MINS.map((mm) => <option key={mm} value={mm}>{String(mm).padStart(2, "0")}분</option>)}
      </select>
    </div>
  );
}

export default function TimeWheel({ value, onChange }) {
  const desktop = useIsDesktop();
  const p = toParts(value);
  const set = (ap, hi, mi) => onChange(toMin(ap, hi, mi));
  if (desktop) return <TimeDropdown value={value} onChange={onChange} />;
  return (
    <div style={{ position: "relative", height: ROW * 3, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
      <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
        <div style={{ position: "absolute", top: "50%", left: -22, right: -22, height: ROW + 10, transform: "translateY(-50%)", background: "rgba(67,85,176,.08)", borderRadius: 16, pointerEvents: "none", zIndex: 0 }} />
        <Col base={AP} index={p.ap} width={68} onPick={(i) => set(i, p.hi, p.mi)} />
        <div style={{ width: 14 }} />
        <Col base={HRS} index={p.hi} width={50} loop onPick={(i) => set(p.ap, i, p.mi)} />
        <div style={{ width: 30 }} />
        <Col base={MINS} index={p.mi} width={50} loop render={(m) => String(m).padStart(2, "0")} onPick={(i) => set(p.ap, p.hi, i)} />
      </div>
      <style jsx>{`.tw-col::-webkit-scrollbar{display:none;width:0;height:0}`}</style>
    </div>
  );
}
