"use client";
// 월 캘린더 (막대 방식). 여러 날 이어지는 바 + 주 경계 세그먼트 + 레인 배치.
// 코치=진한 solid / 선수=연한 tint. 세션 완료=옅음. calendar-design 규칙.
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";

const DOW = ["일", "월", "화", "수", "목", "금", "토"];
const TYPE_COLOR = { 세션: "#4355B0", 프로토콜: "#8E9BE8", 과제: "#9aa0ab", 경기: "#F4978E", 이동: "#7EC8E3", 훈련: "#A0B0FF", 기타: "#6b7280" };
const HEX = (h) => h.replace("#", "");
const rgba = (hex, a) => { const n = parseInt(HEX(hex), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; };
const dstr = (d) => d.toISOString().slice(0, 10);
const day10 = (s) => (s || "").slice(0, 10);

function buildWeeks(year, month) {
  const first = new Date(Date.UTC(year, month - 1, 1));
  const gridStart = new Date(first);
  gridStart.setUTCDate(1 - first.getUTCDay());
  const weeks = [];
  for (let w = 0; w < 6; w++) {
    const days = [];
    for (let d = 0; d < 7; d++) {
      const dt = new Date(gridStart);
      dt.setUTCDate(gridStart.getUTCDate() + w * 7 + d);
      days.push({ date: dstr(dt), day: dt.getUTCDate(), inMonth: dt.getUTCMonth() === month - 1 });
    }
    weeks.push(days);
  }
  return weeks.filter((wk, i) => i < 5 || wk.some((d) => d.inMonth));
}

function weekLayout(week, events) {
  const wkStart = week[0].date, wkEnd = week[6].date;
  const segs = events
    .filter((e) => day10(e.start) <= wkEnd && day10(e.end || e.start) >= wkStart)
    .map((e) => {
      const s = day10(e.start) < wkStart ? wkStart : day10(e.start);
      const en = day10(e.end || e.start) > wkEnd ? wkEnd : day10(e.end || e.start);
      return { e, startCol: week.findIndex((d) => d.date === s), endCol: week.findIndex((d) => d.date === en),
        contL: day10(e.start) < s, contR: day10(e.end || e.start) > en };
    })
    .sort((a, b) => a.startCol - b.startCol || (b.endCol - b.startCol) - (a.endCol - a.startCol));
  const lanes = [];
  for (const seg of segs) {
    let li = lanes.findIndex((l) => l.every((x) => seg.startCol > x.endCol || seg.endCol < x.startCol));
    if (li === -1) { li = lanes.length; lanes.push([]); }
    lanes[li].push(seg); seg.lane = li;
  }
  return { segs, laneCount: lanes.length };
}

function barStyle(e, today) {
  const c = TYPE_COLOR[e.type] || "#6b7280";
  const done = e.kind === "session" && day10(e.start) < today;
  if (done) return { background: "#e5e7f1", color: "#7a82ac" };
  if (e.source === "선수") return { background: rgba(c, 0.26), color: c === "#7EC8E3" ? "#2b7c9e" : c === "#F4978E" ? "#b34d40" : c };
  return { background: c, color: "#fff" };
}

export default function CalendarMonth({ year, month, events = [], today, selected, onSelect, onPrev, onNext, onAdd }) {
  const weeks = buildWeeks(year, month);
  return (
    <div className="bg-card border border-border rounded-2xl p-3.5">
      <div className="flex items-center justify-between px-1 pb-3">
        <div className="text-[16px] font-extrabold">{month}월</div>
        <div className="flex gap-1.5 items-center">
          <button onClick={onPrev} className="w-7 h-7 rounded-lg border border-border flex items-center justify-center active:bg-muted"><ChevronLeft className="w-[15px] h-[15px]" /></button>
          <button onClick={onNext} className="w-7 h-7 rounded-lg border border-border flex items-center justify-center active:bg-muted"><ChevronRight className="w-[15px] h-[15px]" /></button>
          {onAdd ? <button onClick={onAdd} className="h-7 rounded-full bg-primary text-white text-[11.5px] font-bold pl-2 pr-3 flex items-center gap-0.5 active:opacity-90"><Plus className="w-3.5 h-3.5" />일정</button> : null}
        </div>
      </div>
      <div className="grid grid-cols-7 gap-[2px] mb-1">
        {DOW.map((d, i) => <span key={d} className={`text-center text-[10.5px] font-bold ${i === 0 ? "text-coral" : "text-muted-foreground"}`}>{d}</span>)}
      </div>
      {weeks.map((week, wi) => {
        const { segs, laneCount } = weekLayout(week, events);
        return (
          <div key={wi} className="mb-1">
            <div className="grid grid-cols-7">
              {week.map((d) => (
                <button key={d.date} onClick={() => onSelect?.(d.date)} className="text-center py-0.5">
                  <span className={`inline-flex w-[22px] h-[22px] items-center justify-center text-[11.5px] rounded-full ${d.date === selected ? "bg-primary text-white font-extrabold" : d.date === today ? "text-primary font-extrabold" : d.inMonth ? "text-navy font-semibold" : "text-[#c7ccd5] font-medium"}`}>{d.day}</span>
                </button>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-[2px]" style={{ gridTemplateRows: laneCount > 0 ? `repeat(${laneCount}, 15px)` : "none" }}>
              {segs.map((seg, si) => {
                const st = barStyle(seg.e, today);
                const r = { gridColumn: `${seg.startCol + 1} / ${seg.endCol + 2}`, gridRow: seg.lane + 1, ...st,
                  borderTopLeftRadius: seg.contL ? 0 : 5, borderBottomLeftRadius: seg.contL ? 0 : 5,
                  borderTopRightRadius: seg.contR ? 0 : 5, borderBottomRightRadius: seg.contR ? 0 : 5 };
                return <div key={si} style={r} className="h-[15px] text-[9px] font-extrabold leading-[15px] px-1.5 overflow-hidden whitespace-nowrap text-ellipsis">{seg.contL ? "" : seg.e.title}</div>;
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
