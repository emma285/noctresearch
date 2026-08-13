"use client";
// 선수 캘린더 화면 — 월 캘린더 + 선택 날짜 일정 + 내 일정 추가/수정/삭제.
// 코치 일정(세션·프로토콜)은 읽기, 내 일정(경기·이동·훈련·기타)만 편집.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Pencil, Trash2 } from "lucide-react";
import CalendarMonth from "./CalendarMonth";
import AppShell from "./AppShell";

const TYPE_COLOR = { 세션: "#4355B0", 프로토콜: "#8E9BE8", 과제: "#9aa0ab", 경기: "#F4978E", 이동: "#7EC8E3", 훈련: "#A0B0FF", 기타: "#6b7280" };
const ATHLETE_TYPES = ["경기", "이동", "훈련", "기타"];
const DOW = ["일", "월", "화", "수", "목", "금", "토"];
const day10 = (s) => (s || "").slice(0, 10);
const label = (iso) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || ""); return m ? `${+m[2]}월 ${+m[3]}일 (${DOW[new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])).getUTCDay()]})` : ""; };

const emptyForm = { id: null, type: "경기", title: "", start: "", end: "", memo: "" };

export default function ScheduleView({ events = [], myPageId, today }) {
  const router = useRouter();
  const [ty, tm] = today.split("-").map(Number);
  const [year, setYear] = useState(ty);
  const [month, setMonth] = useState(tm);
  const [selected, setSelected] = useState(today);
  const [form, setForm] = useState(null); // null=닫힘, {}=폼

  const prev = () => { if (month === 1) { setYear(year - 1); setMonth(12); } else setMonth(month - 1); };
  const next = () => { if (month === 12) { setYear(year + 1); setMonth(1); } else setMonth(month + 1); };

  const onDay = day10;
  const dayEvents = events.filter((e) => onDay(e.start) <= selected && selected <= onDay(e.end || e.start)).sort((a, b) => (a.start < b.start ? -1 : 1));

  function openAdd() { setForm({ ...emptyForm, start: selected }); }
  function openEdit(e) { setForm({ id: e.id, type: e.type, title: e.title, start: onDay(e.start), end: e.end ? onDay(e.end) : "", memo: e.memo || "" }); }

  async function save() {
    if (!form.start) { alert("날짜를 골라 주세요."); return; }
    const body = { type: form.type, title: form.title || form.type, start: form.start, end: form.end || undefined, memo: form.memo };
    const r = form.id
      ? await fetch("/api/calendar", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: form.id, ...body }) })
      : await fetch("/api/calendar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ masterPageId: myPageId, ...body }) });
    const j = await r.json();
    if (j.success) { setForm(null); router.refresh(); } else alert(j.message || "저장 실패");
  }
  async function remove() {
    if (!confirm("이 일정을 삭제할까요?")) return;
    const r = await fetch("/api/calendar", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: form.id }) });
    const j = await r.json();
    if (j.success) { setForm(null); router.refresh(); } else alert(j.message || "삭제 실패");
  }

  return (
    <AppShell className="flex flex-col" bodyClassName="flex-1 flex flex-col">
      <div className="px-4 pt-[calc(env(safe-area-inset-top)+14px)] pb-2 flex items-center gap-3 flex-shrink-0">
        <button onClick={() => router.push("/portal")} className="w-9 h-9 -ml-1.5 rounded-lg flex items-center justify-center active:bg-muted"><ChevronLeft className="w-6 h-6" /></button>
        <h1 className="text-[20px] font-bold tracking-[-0.3px]">일정</h1>
      </div>

      <div className="px-5 py-2 flex-1">
        <CalendarMonth year={year} month={month} events={events} today={today} selected={selected} onSelect={setSelected} onPrev={prev} onNext={next} onAdd={openAdd} />

        <div className="flex items-center justify-between mt-5 mb-2.5 px-1">
          <h2 className="text-[15px] font-extrabold">{label(selected)}{selected === today ? " · 오늘" : ""}</h2>
        </div>
        {dayEvents.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl py-6 text-center text-[13px] font-semibold text-[#9aa0ab]">이벤트 없음</div>
        ) : (
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            {dayEvents.map((e) => (
              <div key={e.id} className="flex items-center gap-3 p-4 first:border-t-0 border-t border-border">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: TYPE_COLOR[e.type] || "#6b7280" }} />
                <div className="flex-1 min-w-0">
                  <div className="text-[14.5px] font-bold text-foreground">{e.title}</div>
                  <div className="text-[12px] text-muted-foreground mt-0.5">{e.type}{e.source === "선수" ? " · 내가 추가" : ""}{e.memo ? ` · ${e.memo}` : ""}</div>
                </div>
                {e.source === "선수" && e.kind === "event" ? (
                  <button onClick={() => openEdit(e)} className="text-[#aeb4bf] p-1"><Pencil className="w-[17px] h-[17px]" /></button>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 추가/수정 폼 (전체화면) */}
      {form ? (
        <div className="fixed inset-0 z-50 bg-background mx-auto w-full max-w-[430px] flex flex-col">
          <div className="px-4 pt-[calc(env(safe-area-inset-top)+14px)] pb-2 flex items-center justify-between flex-shrink-0 border-b border-border">
            <button onClick={() => setForm(null)} className="text-[14px] font-semibold text-muted-foreground">취소</button>
            <h1 className="text-[16px] font-bold">{form.id ? "일정 수정" : "일정 추가"}</h1>
            <span className="w-8" />
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-4">
            <div className="text-[12px] font-bold text-navy mb-2">종류</div>
            <div className="flex flex-wrap gap-2">
              {ATHLETE_TYPES.map((t) => (
                <button key={t} onClick={() => setForm({ ...form, type: t })} className={`px-3.5 py-2 rounded-xl text-[13px] font-semibold border flex items-center gap-1.5 ${form.type === t ? "border-primary bg-primary/[0.07] text-primary" : "border-border bg-card text-foreground"}`}>
                  <span className="w-2 h-2 rounded-full" style={{ background: TYPE_COLOR[t] }} />{t}
                </button>
              ))}
            </div>
            <div className="text-[12px] font-bold text-navy mt-4 mb-2">제목</div>
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="예: FM Championship" className="w-full rounded-xl border border-border bg-card p-3 text-[14.5px] focus:outline-none focus:border-primary" />
            <div className="text-[12px] font-bold text-navy mt-4 mb-2">날짜</div>
            <div className="flex items-center gap-2">
              <input type="date" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} className="flex-1 rounded-xl border border-border bg-card p-3 text-[14px] focus:outline-none focus:border-primary" />
              <span className="text-muted-foreground text-[13px]">~</span>
              <input type="date" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} className="flex-1 rounded-xl border border-border bg-card p-3 text-[14px] focus:outline-none focus:border-primary" />
            </div>
            <p className="text-[11.5px] text-muted-foreground mt-1.5">하루면 종료일은 비워둬요.</p>
            <div className="text-[12px] font-bold text-navy mt-4 mb-2">메모 (선택)</div>
            <input value={form.memo} onChange={(e) => setForm({ ...form, memo: e.target.value })} placeholder="예: 오후 비행" className="w-full rounded-xl border border-border bg-card p-3 text-[14.5px] focus:outline-none focus:border-primary" />
          </div>
          <div className="px-5 pt-3 pb-[calc(env(safe-area-inset-bottom)+16px)] border-t border-border flex gap-2 flex-shrink-0">
            {form.id ? <button onClick={remove} className="w-12 rounded-xl border border-[#f1cbc3] text-[#c0554a] flex items-center justify-center"><Trash2 className="w-[18px] h-[18px]" /></button> : null}
            <button onClick={save} className="flex-1 bg-primary text-white text-[15px] font-bold py-3.5 rounded-xl active:opacity-90">저장</button>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
