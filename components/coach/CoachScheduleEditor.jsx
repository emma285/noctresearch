"use client";
// 코치 · 특정 선수 일정 편집 — 선수 캘린더(CalendarMonth) 재사용 + 코치용 추가/수정 폼(인라인).
// 코치는 모든 종류(프로토콜·경기·이동·훈련·과제·기타)를 넣고 "선수 공개" 토글까지 제어.
// 세션(kind:session)은 자동 생성이라 읽기 전용. POST/PATCH/DELETE → /api/calendar (masterPageId로 코치 경로).
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, Plus, Eye, EyeOff } from "lucide-react";
import CalendarMonth from "../app/CalendarMonth";

const TYPE_COLOR = { 세션: "#4355B0", 프로토콜: "#8E9BE8", 과제: "#9aa0ab", 경기: "#F4978E", 이동: "#7EC8E3", 훈련: "#A0B0FF", 기타: "#6b7280" };
// 코치가 직접 넣는 종류 (세션은 세션관리에서 자동 생성되므로 제외)
const COACH_TYPES = ["프로토콜", "경기", "이동", "훈련", "과제", "기타"];
const DOW = ["일", "월", "화", "수", "목", "금", "토"];
const day10 = (s) => (s || "").slice(0, 10);
const label = (iso) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || ""); return m ? `${+m[2]}월 ${+m[3]}일 (${DOW[new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])).getUTCDay()]})` : ""; };

const emptyForm = { id: null, type: "프로토콜", title: "", start: "", end: "", memo: "", isPublic: true };

export default function CoachScheduleEditor({ masterPageId, events = [], athleteName = "선수", today }) {
  const router = useRouter();
  const [ty, tm] = (today || "2026-01-01").split("-").map(Number);
  const [year, setYear] = useState(ty);
  const [month, setMonth] = useState(tm);
  const [selected, setSelected] = useState(today);
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);

  const prev = () => { if (month === 1) { setYear(year - 1); setMonth(12); } else setMonth(month - 1); };
  const next = () => { if (month === 12) { setYear(year + 1); setMonth(1); } else setMonth(month + 1); };

  const dayEvents = events
    .filter((e) => day10(e.start) <= selected && selected <= day10(e.end || e.start))
    .sort((a, b) => (a.start < b.start ? -1 : 1));

  function openAdd() { setForm({ ...emptyForm, start: selected, end: selected }); }
  function openEdit(e) { setForm({ id: e.id, type: e.type, title: e.title, start: day10(e.start), end: e.end ? day10(e.end) : "", memo: e.memo || "", isPublic: e.isPublic !== false }); }

  async function save() {
    if (!masterPageId) { alert("이 선수는 아직 마스터 DB에 없어서 일정을 붙일 수 없어요."); return; }
    if (!form.start) { alert("시작 날짜를 골라 주세요."); return; }
    if (form.end && form.end < form.start) { alert("종료일이 시작일보다 빠를 수 없어요."); return; }
    setBusy(true);
    const body = { type: form.type, title: form.title || form.type, start: form.start, end: form.end || undefined, memo: form.memo, isPublic: form.isPublic };
    const r = form.id
      ? await fetch("/api/calendar", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: form.id, ...body }) })
      : await fetch("/api/calendar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ masterPageId, ...body }) });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (j.success) { setForm(null); router.refresh(); } else alert(j.message || "저장 실패");
  }

  async function remove() {
    if (!confirm("이 일정을 삭제할까요?")) return;
    setBusy(true);
    const r = await fetch("/api/calendar", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: form.id }) });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (j.success) { setForm(null); router.refresh(); } else alert(j.message || "삭제 실패");
  }

  const lbl = "text-[12px] font-bold text-navy mb-2";
  const inp = "w-full rounded-xl border border-border bg-card p-3 text-[14px] focus:outline-none focus:border-primary";

  return (
    <div className="bg-white border border-[#e6e7eb] rounded-xl p-4" style={{ boxShadow: "0 1px 2px rgba(13,27,42,.05)" }}>
      <div className="flex items-center justify-between mb-3">
        <div className="text-[13.5px] font-extrabold text-navy">{athleteName} 선수 일정</div>
        <button onClick={openAdd} disabled={!masterPageId} className="h-8 rounded-full bg-primary text-white text-[12.5px] font-bold pl-2.5 pr-3.5 flex items-center gap-1 active:opacity-90 disabled:opacity-40">
          <Plus className="w-4 h-4" />일정 추가
        </button>
      </div>

      {!masterPageId && (
        <div className="mb-3 rounded-xl border border-dashed border-[#e0b9b1] bg-[#fdf3f1] px-3.5 py-2.5 text-[12.5px] text-[#b0574a]">
          이 선수는 아직 마스터 DB에 연결이 안 돼 일정을 저장할 수 없어요. (설문 제출/가입 완료 후 가능)
        </div>
      )}

      <div className="max-w-[460px]">
        <CalendarMonth year={year} month={month} events={events} today={today} selected={selected} onSelect={setSelected} onPrev={prev} onNext={next} onAdd={masterPageId ? openAdd : undefined} />
      </div>

      <div className="mt-4 mb-2 px-1 text-[14px] font-extrabold text-navy">{label(selected)}{selected === today ? " · 오늘" : ""}</div>
      {dayEvents.length === 0 ? (
        <div className="rounded-xl border border-[#eceef2] bg-[#fafbfc] py-5 text-center text-[12.5px] font-semibold text-[#9aa0ab]">이 날 일정 없음</div>
      ) : (
        <div className="rounded-xl border border-[#eceef2] overflow-hidden">
          {dayEvents.map((e) => (
            <div key={e.id} className="flex items-center gap-3 p-3.5 border-t border-[#eef0f3] first:border-t-0 bg-white">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: TYPE_COLOR[e.type] || "#6b7280" }} />
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-bold text-navy truncate">{e.title}</div>
                <div className="text-[11.5px] text-[#8a909b] mt-0.5">
                  {e.type}
                  {e.end && day10(e.end) !== day10(e.start) ? ` · ~${label(e.end)}` : ""}
                  {e.source === "선수" ? " · 선수 입력" : ""}
                  {e.kind !== "session" ? (e.isPublic === false ? " · 비공개" : " · 선수 공개") : ""}
                  {e.memo ? ` · ${e.memo}` : ""}
                </div>
              </div>
              {e.kind === "session" ? (
                <span className="text-[11px] font-bold text-[#9aa0ab] flex-none">세션</span>
              ) : (
                <button onClick={() => openEdit(e)} className="text-[#aeb4bf] p-1 flex-none active:text-primary"><Pencil className="w-[16px] h-[16px]" /></button>
              )}
            </div>
          ))}
        </div>
      )}

      {form && (
        <div className="mt-4 rounded-2xl border border-[#dfe2ea] bg-[#f7f8fa] p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[13.5px] font-extrabold text-navy">{form.id ? "일정 수정" : "새 일정"}</div>
            <button onClick={() => setForm(null)} className="text-[12.5px] font-semibold text-[#9298a2]">닫기</button>
          </div>

          <div className={lbl}>종류</div>
          <div className="flex flex-wrap gap-2 mb-4">
            {COACH_TYPES.map((t) => (
              <button key={t} onClick={() => setForm({ ...form, type: t })} className={`px-3 py-2 rounded-xl text-[13px] font-semibold border flex items-center gap-1.5 ${form.type === t ? "border-primary bg-primary/[0.07] text-primary" : "border-border bg-white text-foreground"}`}>
                <span className="w-2 h-2 rounded-full" style={{ background: TYPE_COLOR[t] }} />{t}
              </button>
            ))}
          </div>

          <div className={lbl}>제목</div>
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="예: 시차 적응 프로토콜 (보스턴)" className={inp + " mb-4"} />

          <div className={lbl}>기간</div>
          <div className="flex items-center gap-2">
            <input type="date" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value, end: form.end && form.end < e.target.value ? e.target.value : form.end })} className={inp + " flex-1"} />
            <span className="text-[#9298a2] text-[13px]">~</span>
            <input type="date" value={form.end} min={form.start || undefined} onChange={(e) => setForm({ ...form, end: e.target.value })} className={inp + " flex-1"} />
          </div>
          <p className="text-[11.5px] text-[#9298a2] mt-1.5 mb-4">하루짜리면 시작·종료를 같은 날로 두거나 종료를 비워요.</p>

          <div className={lbl}>메모 (선택)</div>
          <input value={form.memo} onChange={(e) => setForm({ ...form, memo: e.target.value })} placeholder="예: 저녁 비행 · 도착 후 광노출 루틴" className={inp + " mb-4"} />

          <button onClick={() => setForm({ ...form, isPublic: !form.isPublic })} className="w-full flex items-center justify-between rounded-xl border border-border bg-white px-3.5 py-3 mb-4">
            <span className="flex items-center gap-2 text-[13px] font-semibold text-navy">
              {form.isPublic ? <Eye className="w-4 h-4 text-primary" /> : <EyeOff className="w-4 h-4 text-[#9aa0ab]" />}
              선수에게 공개
            </span>
            <span className={`relative w-10 h-6 rounded-full transition-colors ${form.isPublic ? "bg-primary" : "bg-[#d3d6de]"}`}>
              <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${form.isPublic ? "left-[18px]" : "left-0.5"}`} />
            </span>
          </button>

          <div className="flex gap-2">
            {form.id && <button onClick={remove} disabled={busy} className="w-12 rounded-xl border border-[#f1cbc3] text-[#c0554a] flex items-center justify-center disabled:opacity-40"><Trash2 className="w-[18px] h-[18px]" /></button>}
            <button onClick={save} disabled={busy} className="flex-1 bg-primary text-white text-[14.5px] font-bold py-3 rounded-xl active:opacity-90 disabled:opacity-50">{busy ? "저장 중…" : "저장"}</button>
          </div>
        </div>
      )}
    </div>
  );
}
