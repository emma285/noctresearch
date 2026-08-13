"use client";
// 수면·루틴 타임라인 (세션 가이드 준비용). 분 단위 · 입면/침대밖/밤중깸 반영 · 일일 너비 고정.
// 색=루틴 로그 파스텔 칩 / 수면=네이비블루. 그리드 정렬 위해 헤더·메모 높이 고정.
import { useState } from "react";

const T = {
  training: { l: "훈련", c: "#4355B0", bg: "#eef0fb" },
  caffeine: { l: "카페인", c: "#B9770E", bg: "#fbf3e6" },
  nap: { l: "낮잠", c: "#3aa7cf", bg: "#e8f5fb" },
  meal: { l: "식사", c: "#1F8A4C", bg: "#e7f4ec" },
  alcohol: { l: "술", c: "#F4978E", bg: "#fdeeeb" },
  etc: { l: "기타", c: "#6b7280", bg: "#f1f2f4" },
};
const ASLEEP = "#2a4a78", AWAKE = "#c2cbd8";
const SOL = { "바로 잠들어요": 4, "15분 이내": 12, "30분쯤": 30, "1시간쯤": 60, "1시간 이상": 90 };
const OUT = { "바로 나왔어요": 0, "10분 이내": 8, "30분쯤": 30, "1시간쯤": 60, "1시간 이상": 90 };
const LEGEND = [["수면", "#2a4a78"], ["누워있음/깬 채", "#c2cbd8"], ["훈련", "#4355B0"], ["카페인", "#B9770E"], ["낮잠", "#3aa7cf"], ["식사", "#1F8A4C"], ["술", "#F4978E"], ["기타", "#6b7280"]];
const DOW = ["일", "월", "화", "수", "목", "금", "토"];
const PXH = 40, H = 24 * PXH;

const dobj = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(Date.UTC(y, m - 1, d)); };
const dlabel = (s) => { const d = dobj(s); return `${d.getUTCMonth() + 1}/${d.getUTCDate()}(${DOW[d.getUTCDay()]})`; };
const fmt = (m) => { m = ((m % 1440) + 1440) % 1440; return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`; };

export default function LogTimeline({ cols = [], sleeps = [], routines = [] }) {
  const [tip, setTip] = useState(null);
  const idx = (s) => cols.indexOf(s);
  const abs = (d, c) => d * 1440 + c;
  const colStart = (c) => c * 1440 + 360;
  const segs = (a, b) => { const o = []; for (let c = 0; c < cols.length; c++) { const s = colStart(c), e = s + 1440, os = Math.max(a, s), oe = Math.min(b, e); if (oe > os) o.push({ col: c, top: (os - s) / 60 * PXH, h: (oe - os) / 60 * PXH }); } return o; };

  const BLOCKS = [];
  for (const rt of routines) { const di = idx(rt.date); if (di < 0) continue; const a = abs(di, rt.t); const t = T[rt.type] || T.etc; segs(a, a + (rt.dur || 30)).forEach((sg, i) => BLOCKS.push({ ...sg, kind: "rout", bg: t.bg, fg: t.c, time: fmt(rt.t), cat: t.l + (rt.d ? " " + rt.d : ""), isStart: i === 0 })); }
  for (const s of sleeps) {
    const D = idx(s.date); if (D < 0) continue;
    const bedDay = s.bed > s.wake ? D - 1 : D;
    const bA = abs(bedDay, s.bed), wA = abs(D, s.wake);
    const sol = SOL[s.sol] || 0, out = OUT[s.out] || 0;
    if (sol > 0) segs(bA, bA + sol).forEach((sg, i) => BLOCKS.push({ ...sg, kind: "awake", tip: "누워있음 " + sol + "분", isStart: i === 0 }));
    segs(bA + sol, wA).forEach((sg, i) => BLOCKS.push({ ...sg, kind: "sleep", bedT: fmt(s.bed), wakeT: fmt(s.wake), sol, out, woke: s.woke, waso: s.waso, isStart: i === 0 }));
    if (out > 0) segs(wA, wA + out).forEach((sg, i) => BLOCKS.push({ ...sg, kind: "awake", tip: "침대밖 " + out + "분", isStart: i === 0 }));
  }

  const openTip = (e, text) => { e.stopPropagation(); const r = e.currentTarget.getBoundingClientRect(); setTip({ text, x: Math.min(r.left, window.innerWidth - 252), y: r.bottom + 4 }); };
  const hourLabels = Array.from({ length: 25 }, (_, r) => ({ r, h: (r + 6) % 24 }));

  return (
    <div onClick={() => setTip(null)}>
      <div style={{ display: "flex", border: "1px solid #e6e7eb", borderRadius: 12, overflowX: "auto", overflowY: "hidden" }}>
        {/* 축 */}
        <div style={{ width: 50, flexShrink: 0, borderRight: "1px solid #eef0f2", position: "sticky", left: 0, background: "#fff", zIndex: 2 }}>
          <div style={{ height: 32, borderBottom: "1px solid #e6e7eb", background: "#f7f8fa" }} />
          <div style={{ height: 64, borderBottom: "1px solid #e6e7eb" }} />
          <div style={{ position: "relative", height: H }}>
            {hourLabels.map(({ r, h }) => (
              <div key={r} style={{ position: "absolute", top: r * PXH, right: 6, fontSize: 10, color: "#aeb4c0", fontWeight: 600, transform: "translateY(-50%)", fontVariantNumeric: "tabular-nums" }}>{String(h).padStart(2, "0")}:00</div>
            ))}
          </div>
        </div>
        {/* 컬럼들 */}
        {cols.map((cd, ci) => {
          const sl = sleeps.find((s) => s.date === cd);
          const full = sl ? (sl.feel + (sl.memo ? " — " + sl.memo : "")) : "";
          return (
            <div key={cd} style={{ width: 150, flex: "none", borderRight: ci === cols.length - 1 ? "none" : "1px solid #eef0f2", position: "relative" }}>
              <div style={{ height: 32, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 12, borderBottom: "1px solid #e6e7eb", background: "#f7f8fa" }}>{dlabel(cd)}</div>
              <div onClick={(e) => full && openTip(e, full)} title={full}
                style={{ height: 64, padding: "6px 7px", borderBottom: "1px solid #e6e7eb", fontSize: 10, lineHeight: 1.45, color: "#3f4453", overflow: "hidden", position: "relative", cursor: full ? "pointer" : "default" }}>
                {sl && <div style={{ display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{sl.feel}{sl.memo && <span style={{ color: "#8a90a0" }}> {sl.memo}</span>}</div>}
                {full.length > 42 && <span style={{ position: "absolute", right: 5, bottom: 2, color: "#aeb4c0", fontWeight: 800, background: "#fff", paddingLeft: 3 }}>⋯</span>}
              </div>
              <div style={{ position: "relative", height: H }}>
                {hourLabels.map(({ r }) => <div key={r} style={{ position: "absolute", left: 0, right: 0, top: r * PXH, borderTop: "1px solid #f3f4f6" }} />)}
                {BLOCKS.filter((b) => b.col === ci).map((b, bi) => {
                  const hh = Math.max(b.h, 6);
                  const base = { position: "absolute", left: 3, right: 3, top: b.top, height: hh, borderRadius: 6, overflow: "hidden", background: b.bg };
                  if (b.kind === "awake") return <div key={bi} style={{ ...base, background: AWAKE, padding: "1px 6px" }}>{b.h >= 15 && <span style={{ color: "#33405c", fontWeight: 700, fontSize: 9, whiteSpace: "nowrap" }}>{b.tip}</span>}</div>;
                  if (b.kind === "sleep") return (
                    <div key={bi} style={{ ...base, background: ASLEEP, color: "#fff", padding: "3px 6px" }}>
                      {b.isStart && b.h >= 44 ? (
                        <div style={{ fontSize: 9.5, lineHeight: 1.5, fontWeight: 600 }}>
                          <b style={{ fontWeight: 800, fontSize: 10.5 }}>취침 {b.bedT}</b><br />기상 {b.wakeT}<br />입면 {b.sol}분 · 침대밖 {b.out}분<br />{b.woke ? `밤중깸 ${b.woke}회${b.waso ? ` (${b.waso})` : ""}` : "밤중깸 없음"}
                        </div>
                      ) : (!b.isStart ? <span style={{ color: "#fff", fontWeight: 700, fontSize: 9 }}>기상 {b.wakeT}</span> : null)}
                    </div>
                  );
                  // 루틴
                  return (
                    <div key={bi} style={{ ...base, color: b.fg, padding: b.h >= 16 ? "3px 6px" : "0 6px" }}>
                      {b.h >= 30 ? (<><span style={{ fontWeight: 800, fontSize: 10.5, fontVariantNumeric: "tabular-nums", display: "block", lineHeight: 1.15 }}>{b.time}</span><span style={{ fontWeight: 600, fontSize: 9.5, display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{b.cat}</span></>)
                        : (<span style={{ fontWeight: 700, fontSize: b.h >= 16 ? 9.5 : 8.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", display: "block" }}>{b.h >= 16 ? b.cat : b.cat.split(" ")[0]}</span>)}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      {/* 범례 */}
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 10, fontSize: 11, color: "#4b5563", fontWeight: 600 }}>
        {LEGEND.map(([l, c]) => <span key={l} style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><span style={{ width: 12, height: 12, borderRadius: 3, background: c, display: "inline-block" }} />{l}</span>)}
      </div>
      {tip && <div style={{ position: "fixed", left: tip.x, top: tip.y, maxWidth: 240, background: "#0D1B2A", color: "#fff", fontSize: 11, lineHeight: 1.5, padding: "9px 11px", borderRadius: 9, boxShadow: "0 8px 24px rgba(13,27,42,.28)", zIndex: 50 }}>{tip.text}</div>}
    </div>
  );
}
