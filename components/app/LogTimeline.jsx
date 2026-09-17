"use client";
// 수면·루틴 타임라인 (세션 가이드 준비용). 분 단위 · 입면/침대밖/밤중깸 반영 · 일일 너비 고정.
// 색=루틴 로그 파스텔 칩 / 수면=네이비블루. 그리드 정렬 위해 헤더·메모 높이 고정.
// tz 크로싱: 06시 기준 윈도우에 tz를 귀속 → 해외 밤이 그려지는 칸은 듀얼 헤더(현지날짜·지역 + 한국 환산일),
//           tz 바뀌는 경계엔 ✈ 구분선. 홈(서울)전용 데이터는 기존과 동일하게 렌더(게이팅).
import { useState, useRef, useEffect } from "react";
import { tzBadgeLabel, tzRegionLabel, localToHome, cityOf, HOME_TZ } from "../../lib/tz";

// 'YYYY-MM-DD' + 일수 → 'YYYY-MM-DD'
const isoAdd = (s, n) => { const [y, m, d] = s.split("-").map(Number); return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10); };
// 06시-기준 윈도우 날짜: 06:00 이후는 그 날짜, 00:00~05:59는 전날 밤 윈도우.
const windowDateOf = (dateStr, min) => (min == null || min >= 360 ? dateStr : isoAdd(dateStr, -1));
// 지역 짧은 라벨 (좁은 컬럼용). "미국 동부 (뉴욕·보스턴)" → "미국 동부".
const shortRegion = (tz) => (tzRegionLabel(tz) || cityOf(tz)).replace(/\s*\(.*\)$/, "");

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

const dobj = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(Date.UTC(y, m - 1, d)); };
const dlabel = (s) => { const d = dobj(s); return `${d.getUTCMonth() + 1}/${d.getUTCDate()}(${DOW[d.getUTCDay()]})`; };
const fmt = (m) => { m = ((m % 1440) + 1440) % 1440; return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`; };

export default function LogTimeline({ cols = [], sleeps = [], routines = [], targets = [], showTargets = false, kstView = false, pxh = 40 }) {
  const [tip, setTip] = useState(null);
  // 시간축 픽셀/시간. 작게 주면(예: 24) 하루 24시간이 세로로 압축돼 한 화면에 들어옴.
  const PXH = pxh, H = 24 * PXH;
  const labelStep = PXH < 30 ? 2 : 1; // 압축 시 시각 라벨은 2시간 간격으로만(겹침 방지)
  // 긴 기간이면 열자마자 최신(오른쪽 끝)이 보이게 스크롤 — 과거는 왼쪽으로 스크롤해서 확인.
  const scrollRef = useRef(null);
  useEffect(() => { const el = scrollRef.current; if (el) el.scrollLeft = el.scrollWidth; }, [cols.length]);
  // 이동일(로그 tz가 섞인 날) 자동 분리 — 윈도우별 등장 tz 수집 → 2개 이상이면 tz별 컬럼으로 쪼갬(서울 먼저).
  const homeTz = (tz) => tz || HOME_TZ;
  const sleepTzOf = (s) => homeTz(s.wakeTz || s.tz);
  const routineTzOf = (r) => homeTz(r.tz);
  const dateTzs = {};
  const addTz = (date, tz) => { if (!cols.includes(date)) return; (dateTzs[date] = dateTzs[date] || new Set()).add(tz); };
  // 수면: 블록이 실제 그려지는 06시-윈도우 날짜에 취침/기상 tz 각각 귀속(취침 저녁, 기상 새벽).
  for (const s of sleeps) {
    const bedTz = homeTz(s.bedTz || s.tz), wakeTz = homeTz(s.wakeTz || s.tz);
    const bedDateStr = s.bed > s.wake ? isoAdd(s.date, -1) : s.date;
    addTz(windowDateOf(bedDateStr, s.bed), bedTz);
    addTz(windowDateOf(s.date, s.wake), wakeTz);
  }
  for (const r of routines) addTz(windowDateOf(r.date, r.t), routineTzOf(r));
  const splitDates = new Set(Object.keys(dateTzs).filter((d) => dateTzs[d].size > 1));
  const COLUMNS = [];
  for (const date of cols) {
    if (splitDates.has(date)) {
      const tzs = [...dateTzs[date]].sort((a, b) => (a === HOME_TZ ? -1 : b === HOME_TZ ? 1 : a < b ? -1 : 1));
      for (const tz of tzs) COLUMNS.push({ key: `${date}|${tz}`, date, tzRaw: tz, split: true });
    } else {
      COLUMNS.push({ key: date, date, tzRaw: dateTzs[date] ? [...dateTzs[date]][0] : HOME_TZ, split: false });
    }
  }
  const NC = COLUMNS.length;
  const colKeyOf = (date, tz) => (splitDates.has(date) ? `${date}|${tz}` : date);
  const colIdx = (key) => COLUMNS.findIndex((c) => c.key === key);
  const targetColIdx = (date) => { let D = colIdx(colKeyOf(date, HOME_TZ)); if (D < 0) D = COLUMNS.findIndex((c) => c.date === date); return D; };
  const abs = (d, c) => d * 1440 + c;
  const colStart = (c) => c * 1440 + 360;
  const segs = (a, b) => { const o = []; for (let c = 0; c < NC; c++) { const s = colStart(c), e = s + 1440, os = Math.max(a, s), oe = Math.min(b, e); if (oe > os) o.push({ col: c, top: (os - s) / 60 * PXH, h: (oe - os) / 60 * PXH }); } return o; };
  const pickCol = (arr) => (arr.length ? arr.reduce((a, b) => (b.h > a.h ? b : a)).col : -1);

  // 컬럼별 tz 성격(실제 그려진 블록 기준). colForeign=해외tz, colHasHome=홈블록 있음, colKorea=한국환산일, colSleepNote=그 칸 수면.
  const colForeign = {}, colHasHome = {}, colKorea = {}, colSleepNote = {};
  const markCol = (ci, tz, koreaDate, sleep) => {
    if (ci < 0) return;
    if (tz && tz !== HOME_TZ) { colForeign[ci] = tz; if (koreaDate) colKorea[ci] = koreaDate; if (sleep) colSleepNote[ci] = sleep; }
    else colHasHome[ci] = true;
  };

  const BLOCKS = [];
  for (const rt of routines) { const di = colIdx(colKeyOf(rt.date, routineTzOf(rt))); if (di < 0) continue; const a = abs(di, rt.t); const t = T[rt.type] || T.etc; const foreign = !!(rt.tz && rt.tz !== HOME_TZ); const kstT = foreign ? fmt(localToHome(rt.date, rt.t, rt.tz).min) : null; markCol(di, routineTzOf(rt), foreign ? localToHome(rt.date, rt.t, rt.tz).date : null, null); segs(a, a + (rt.dur || 30)).forEach((sg, i) => BLOCKS.push({ ...sg, kind: "rout", bg: t.bg, fg: t.c, time: fmt(rt.t), kstT, foreign, cat: (rt.type === "etc" && rt.text) ? (t.l + " · " + rt.text) : (t.l + (rt.d ? " " + rt.d : "") + (rt.text ? " · " + rt.text : "")), isStart: i === 0 })); }
  for (const s of sleeps) {
    const D = colIdx(colKeyOf(s.date, sleepTzOf(s))); if (D < 0) continue;
    const bedDay = s.bed > s.wake ? D - 1 : D;
    const bA = abs(bedDay, s.bed), wA = abs(D, s.wake);
    const sol = SOL[s.sol] || 0, out = OUT[s.out] || 0;
    // tz: 단일(tz) 또는 이동 시 취침/기상 각각(bedTz/wakeTz). 없으면 홈 간주.
    const wakeTz = s.wakeTz || s.tz || null, bedTz = s.bedTz || s.tz || null;
    const bedDateStr = s.bed > s.wake ? isoAdd(s.date, -1) : s.date;
    const crossing = !!(bedTz && wakeTz && bedTz !== wakeTz);
    const foreign = !!((bedTz && bedTz !== HOME_TZ) || (wakeTz && wakeTz !== HOME_TZ));
    const bedKstT = foreign ? fmt(localToHome(bedDateStr, s.bed, bedTz).min) : null;
    const wakeKstT = foreign ? fmt(localToHome(s.date, s.wake, wakeTz).min) : null;
    const bedCity = crossing ? cityOf(bedTz) : "", wakeCity = crossing ? cityOf(wakeTz) : "";
    if (sol > 0) segs(bA, bA + sol).forEach((sg, i) => BLOCKS.push({ ...sg, kind: "awake", tip: "누워있음 " + sol + "분", isStart: i === 0 }));
    const sSegs = segs(bA + sol, wA);
    sSegs.forEach((sg, i) => BLOCKS.push({ ...sg, kind: "sleep", bedT: fmt(s.bed), wakeT: fmt(s.wake), bedKstT, wakeKstT, foreign, crossing, bedCity, wakeCity, sol, out, woke: s.woke, waso: s.waso, isStart: i === 0 }));
    if (out > 0) segs(wA, wA + out).forEach((sg, i) => BLOCKS.push({ ...sg, kind: "awake", tip: "침대밖 " + out + "분", isStart: i === 0 }));
    // 이 수면이 주로 그려지는 칸에 tz 성격 귀속.
    const primaryCol = pickCol(sSegs);
    const kDate = foreign ? localToHome(s.date, s.wake, wakeTz).date : null;
    markCol(primaryCol, homeTz(wakeTz || bedTz), kDate, s);
  }

  // 각 컬럼의 유효 tz — 빈 컬럼(로그없음)은 직전 tz를 이어받아(비행 후 체류일도 해외로) 잘못된 ✈ 방지.
  const effTz = []; let carry = HOME_TZ;
  for (let ci = 0; ci < NC; ci++) {
    if (colForeign[ci]) { carry = colForeign[ci]; effTz[ci] = colForeign[ci]; }
    else if (colHasHome[ci]) { carry = HOME_TZ; effTz[ci] = HOME_TZ; }
    else effTz[ci] = carry;
  }
  const anyForeign = Object.keys(colForeign).length > 0;

  // 목표(프로토콜) 오버레이 — 실제 수면과 동일한 seg 로직으로 유령 막대 생성.
  const on = showTargets && targets.length > 0;
  const targetByColKey = {}; if (on) for (const t of targets) { const D = targetColIdx(t.date); if (D >= 0) targetByColKey[COLUMNS[D].key] = t; }
  const TARGET_BLOCKS = [];
  if (on) for (const t of targets) {
    const D = targetColIdx(t.date); if (D < 0 || typeof t.bed !== "number" || typeof t.wake !== "number") continue;
    const bedDay = t.bed > t.wake ? D - 1 : D;
    segs(abs(bedDay, t.bed), abs(D, t.wake)).forEach((sg, i) => TARGET_BLOCKS.push({ ...sg, isStart: i === 0 }));
  }
  // 편차 텍스트 (실제-목표, 분). 음수=이르게, 양수=늦게.
  const DTXT = (a, t) => { const d = a - t, m = Math.abs(d), h = Math.floor(m / 60), mm = m % 60; return { s: (d < 0 ? "−" : d > 0 ? "+" : "") + ((h ? h + "h" : "") + (mm ? mm + "m" : "") || "정시"), c: d < 0 ? "#c0554a" : d > 0 ? "#2a7fa5" : "#1f8a4c" }; };

  const openTip = (e, text) => { e.stopPropagation(); const r = e.currentTarget.getBoundingClientRect(); setTip({ text, x: Math.min(r.left, window.innerWidth - 252), y: r.bottom + 4 }); };
  const hourLabels = Array.from({ length: 25 }, (_, r) => ({ r, h: (r + 6) % 24 }));
  const NOTE_H = anyForeign ? 78 : 64; // 듀얼 헤더 있으면 노트 영역 살짝 키움

  // ✈ 경계 구분선 (컬럼 사이). 좌우 tz가 다를 때.
  const Divider = () => (
    <div style={{ flex: "0 0 26px", width: 26, flexShrink: 0, position: "relative", background: "#fbfbfd" }}>
      <div style={{ height: 32, borderBottom: "1px solid #e6e7eb" }} />
      <div style={{ height: NOTE_H, borderBottom: "1px solid #e6e7eb", display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: 6 }}>
        <span style={{ fontSize: 13 }}>✈</span>
      </div>
      <div style={{ position: "relative", height: H }}>
        <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: 0, borderLeft: "2px dashed #cfd6e3", transform: "translateX(-50%)" }} />
      </div>
    </div>
  );

  return (
    <div onClick={() => setTip(null)}>
      <div ref={scrollRef} style={{ display: "flex", border: "1px solid #e6e7eb", borderRadius: 12, overflowX: "auto", overflowY: "hidden", background: "#fff" }}>
        {/* 축 */}
        <div style={{ width: 50, flexShrink: 0, borderRight: "1px solid #eef0f2", position: "sticky", left: 0, background: "#fff", zIndex: 5 }}>
          <div style={{ height: 32, borderBottom: "1px solid #e6e7eb", background: "#fff" }} />
          <div style={{ height: NOTE_H, borderBottom: "1px solid #e6e7eb" }} />
          <div style={{ position: "relative", height: H }}>
            {hourLabels.filter(({ r }) => r % labelStep === 0).map(({ r, h }) => (
              <div key={r} style={{ position: "absolute", top: r * PXH, right: 6, fontSize: 10, color: "#aeb4c0", fontWeight: 600, transform: "translateY(-50%)", fontVariantNumeric: "tabular-nums" }}>{String(h).padStart(2, "0")}:00</div>
            ))}
          </div>
        </div>
        {/* 컬럼들 */}
        {COLUMNS.map((col, ci) => {
          const cd = col.date;
          const fTz = colForeign[ci];                       // 이 칸에 그려진 해외 tz (있으면 듀얼 헤더)
          const boundary = ci > 0 && effTz[ci] !== effTz[ci - 1]; // 좌측과 tz 다름 → ✈
          const noteSleep = fTz ? colSleepNote[ci] : null;
          const slForNote = fTz ? noteSleep : sleeps.find((s) => colKeyOf(s.date, sleepTzOf(s)) === col.key);
          const full = slForNote ? (slForNote.feel + (slForNote.memo ? " — " + slForNote.memo : "")) : "";
          const tgt = on ? targetByColKey[col.key] : null;
          const kd = fTz ? localToHome(cd, 720, fTz).date : null; // 정오 기준 한국 환산일(순서 무관·안정)
          return (
            <div key={col.key} style={{ display: "contents" }}>
              {boundary ? <Divider /> : null}
              <div style={{ flex: "0 0 118px", width: 118, minWidth: 0, borderRight: ci === NC - 1 ? "none" : "1px solid #eef0f2", position: "relative" }}>
                <div style={{ height: 32, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 12, borderBottom: "1px solid #e6e7eb", background: fTz ? "#fbf6f4" : "#fff" }}>{dlabel(cd)}</div>
                <div onClick={(e) => full && openTip(e, full)} title={full}
                  style={{ height: NOTE_H, padding: "6px 7px", borderBottom: "1px solid #e6e7eb", fontSize: 10, lineHeight: 1.4, color: "#3f4453", overflow: "hidden", position: "relative", cursor: full ? "pointer" : "default" }}>
                  {fTz && (
                    <div style={{ marginBottom: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      <span style={{ display: "inline-block", fontSize: 8.5, fontWeight: 800, color: "#a8483b", background: "#F9DED8", borderRadius: 4, padding: "0 4px" }} title={tzBadgeLabel(fTz)}>🌐 {shortRegion(fTz)}</span>
                      {kd && <span style={{ display: "block", fontSize: 9, fontWeight: 800, color: "#2a7fa5", marginTop: 2 }}>한국 {dlabel(kd)}</span>}
                    </div>
                  )}
                  {tgt && (
                    <div style={{ fontSize: 9, fontWeight: 800, marginBottom: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {tgt.label && <span style={{ color: "#5A4FA6", background: "rgba(142,155,232,.16)", borderRadius: 4, padding: "1px 4px", marginRight: 4 }}>{tgt.label}</span>}
                      {slForNote
                        ? (<span style={{ color: "#6b7280" }}>기상 <b style={{ color: DTXT(slForNote.wake, tgt.wake).c }}>{DTXT(slForNote.wake, tgt.wake).s}</b> · 취침 <b style={{ color: DTXT(slForNote.bed, tgt.bed).c }}>{DTXT(slForNote.bed, tgt.bed).s}</b></span>)
                        : <span style={{ color: "#c2c7cf" }}>기록 없음</span>}
                    </div>
                  )}
                  {slForNote && <div style={{ display: "-webkit-box", WebkitLineClamp: (tgt ? 1 : 2), WebkitBoxOrient: "vertical", overflow: "hidden" }}>{slForNote.feel}{slForNote.memo && <span style={{ color: "#8a90a0" }}> {slForNote.memo}</span>}</div>}
                  {!tgt && full.length > 42 && <span style={{ position: "absolute", right: 5, bottom: 2, color: "#aeb4c0", fontWeight: 800, background: fTz ? "#fff" : "#fff", paddingLeft: 3 }}>⋯</span>}
                </div>
                <div style={{ position: "relative", height: H }}>
                  {hourLabels.map(({ r }) => <div key={r} style={{ position: "absolute", left: 0, right: 0, top: r * PXH, borderTop: "1px solid #f3f4f6" }} />)}
                  {on && TARGET_BLOCKS.filter((b) => b.col === ci).map((b, ti) => (
                    <div key={"t" + ti} style={{ position: "absolute", left: 1, right: 1, top: b.top, height: Math.max(b.h, 8), borderRadius: 7, border: "2px dashed #EC6BA8", background: "transparent", boxSizing: "border-box", zIndex: 3, pointerEvents: "none" }}>
                      {b.isStart && b.h > 26 ? <span style={{ position: "absolute", top: 1, left: 4, fontSize: 8, fontWeight: 800, color: "#C13E80", background: "rgba(255,255,255,.8)", borderRadius: 3, padding: "0 3px" }}>목표</span> : null}
                    </div>
                  ))}
                  {BLOCKS.filter((b) => b.col === ci).map((b, bi) => {
                    const hh = Math.max(b.h, 6);
                    const base = { position: "absolute", left: 3, right: 3, top: b.top, height: hh, borderRadius: 6, overflow: "hidden", background: b.bg, zIndex: 1 };
                    // 표시 시각: 한국시간 토글이 켜지고 해외 로그면 KST 환산값. 이동(취침/기상 tz 다름)이면 도시 라벨.
                    const kv = kstView && b.foreign;
                    const bt = kv ? (b.bedKstT || b.bedT) : b.bedT, wt = kv ? (b.wakeKstT || b.wakeT) : b.wakeT, rtime = kv ? (b.kstT || b.time) : b.time;
                    const bc = b.crossing && !kstView ? ` ${b.bedCity}` : "", wc = b.crossing && !kstView ? ` ${b.wakeCity}` : "";
                    if (b.kind === "awake") return <div key={bi} style={{ ...base, background: AWAKE, padding: "1px 6px" }}>{b.h >= 15 && <span style={{ color: "#33405c", fontWeight: 700, fontSize: 9, whiteSpace: "nowrap" }}>{b.tip}</span>}</div>;
                    if (b.kind === "sleep") return (
                      <div key={bi} style={{ ...base, background: ASLEEP, color: "#fff", padding: "3px 6px" }}>
                        {b.isStart && b.h >= 44 ? (
                          <div style={{ fontSize: 9.5, lineHeight: 1.5, fontWeight: 600 }}>
                            <b style={{ fontWeight: 800, fontSize: 10.5 }}>취침 {bt}{bc}</b><br />기상 {wt}{wc}<br />입면 {b.sol}분 · 침대밖 {b.out}분<br />{b.woke ? `밤중깸 ${b.woke}회${b.waso ? ` (${b.waso})` : ""}` : "밤중깸 없음"}{kv ? <><br /><span style={{ opacity: .75, fontWeight: 700 }}>한국 시간 기준</span></> : null}
                          </div>
                        ) : (!b.isStart ? <span style={{ color: "#fff", fontWeight: 700, fontSize: 9 }}>기상 {wt}</span> : null)}
                      </div>
                    );
                    // 루틴
                    return (
                      <div key={bi} title={b.cat} style={{ ...base, color: b.fg, padding: b.h >= 16 ? "3px 6px" : "0 6px" }}>
                        {b.h >= 30 ? (<><span style={{ fontWeight: 800, fontSize: 10.5, fontVariantNumeric: "tabular-nums", display: "block", lineHeight: 1.15 }}>{rtime}</span><span style={{ fontWeight: 600, fontSize: 9.5, display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{b.cat}</span></>)
                          : (<span style={{ fontWeight: 700, fontSize: b.h >= 16 ? 9.5 : 8.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", display: "block" }}>{b.h >= 16 ? b.cat : b.cat.split(" ")[0]}</span>)}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {/* 범례 */}
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 10, fontSize: 11, color: "#4b5563", fontWeight: 600 }}>
        {LEGEND.map(([l, c]) => <span key={l} style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><span style={{ width: 12, height: 12, borderRadius: 3, background: c, display: "inline-block" }} />{l}</span>)}
        {anyForeign && <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>✈ 시간대 이동 · 🌐 현지날짜/지역 · <span style={{ color: "#2a7fa5", fontWeight: 800 }}>한국</span> 환산일</span>}
        {on && <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><span style={{ width: 12, height: 12, borderRadius: 3, border: "2px dashed #EC6BA8", background: "rgba(236,107,168,.14)", display: "inline-block", boxSizing: "border-box" }} />목표(프로토콜)</span>}
      </div>
      {tip && <div style={{ position: "fixed", left: tip.x, top: tip.y, maxWidth: 240, background: "#0D1B2A", color: "#fff", fontSize: 11, lineHeight: 1.5, padding: "9px 11px", borderRadius: 9, boxShadow: "0 8px 24px rgba(13,27,42,.28)", zIndex: 50 }}>{tip.text}</div>}
    </div>
  );
}
