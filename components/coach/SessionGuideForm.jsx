"use client";
// 세션 가이드(세션 전 준비) — 타임라인 + 코치 논의 입력 + AI 생성 + 편집 + 메모 + 저장.
import { useState } from "react";
import { Sparkles } from "lucide-react";
import LogTimeline from "../app/LogTimeline";

const TA = ({ value, onChange, rows = 3, ph }) => (
  <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows} placeholder={ph}
    style={{ fontFamily: "inherit" }}
    className="w-full rounded-xl border border-border bg-card p-3 text-[14.5px] text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:border-primary resize-none leading-relaxed" />
);

function Field({ label, value, onChange, rows, ph }) {
  return (
    <div>
      <div className="text-[13px] font-bold text-navy mb-1.5">{label}</div>
      <TA value={value} onChange={onChange} rows={rows} ph={ph} />
    </div>
  );
}

export default function SessionGuideForm({ session, timeline }) {
  const g0 = session.guide || {};
  const [discuss, setDiscuss] = useState(g0.discuss || "");
  const [goal, setGoal] = useState(g0.goal || "");
  const [topics, setTopics] = useState(g0.topics || "");
  const [checks, setChecks] = useState(g0.checks || "");
  const [questions, setQuestions] = useState(g0.questions || "");
  const [memo, setMemo] = useState(g0.memo || "");
  const [gen, setGen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function generate() {
    setGen(true);
    try {
      const r = await fetch("/api/coach/session-guide", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: session.id, action: "generate", discuss }),
      }).then((r) => r.json());
      if (r.success && r.guide) { setGoal(r.guide.goal || ""); setTopics(r.guide.topics || ""); setChecks(r.guide.checks || ""); setQuestions(r.guide.questions || ""); }
      else alert(r.message || "생성 실패");
    } catch (e) { alert("생성 실패: " + e.message); }
    setGen(false);
  }
  async function save() {
    setSaving(true); setSaved(false);
    try {
      const r = await fetch("/api/coach/session-guide", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: session.id, action: "save", guide: { discuss, goal, topics, checks, questions, memo } }),
      }).then((r) => r.json());
      if (r.success) { setSaved(true); setTimeout(() => setSaved(false), 2000); } else alert(r.message || "저장 실패");
    } catch (e) { alert("저장 실패: " + e.message); }
    setSaving(false);
  }

  const hasData = (timeline?.sleeps?.length || 0) + (timeline?.routines?.length || 0) > 0;

  return (
    <div className="space-y-6">
      {/* 1) 수면·루틴 패턴 */}
      <section>
        <div className="text-[13px] font-bold text-navy mb-2">수면·루틴 패턴 <span className="text-muted-foreground font-medium">· 최근 로그 (수면은 전날 밤 기준)</span></div>
        {hasData ? <LogTimeline cols={timeline.cols} sleeps={timeline.sleeps} routines={timeline.routines} />
          : <div className="bg-muted/40 border border-border rounded-xl py-8 text-center text-[13px] text-muted-foreground">최근 기록이 없어요.</div>}
      </section>

      {/* 2) 코치 논의 입력 + AI 생성 */}
      <section className="space-y-2">
        <Field label="이번 세션에서 논의할 것 (코치 입력)" value={discuss} onChange={setDiscuss} rows={3} ph="예: 8/13 입면 30분 걸린 이유 · 카페인 타이밍 · 원정 앞두고 리듬 점검…" />
        <button type="button" onClick={generate} disabled={gen}
          className="inline-flex items-center gap-1.5 bg-primary text-white text-[14px] font-bold px-4 py-2.5 rounded-xl active:opacity-90 disabled:opacity-60">
          <Sparkles className="w-4 h-4" viewBox="0 0 24 24" />{gen ? "AI가 가이드 만드는 중…" : "AI 가이드 생성"}
        </button>
        <p className="text-[12px] text-muted-foreground">위 타임라인 패턴 + 논의 포인트{session.n > 1 ? " + 지난 세션" : ""}을 읽고 아래 4개 섹션을 채워요. 생성 후 자유롭게 수정하세요.</p>
      </section>

      {/* 3) AI 생성 섹션 (편집 가능) */}
      <div className="space-y-4">
        <Field label="이번 세션 목표" value={goal} onChange={setGoal} rows={2} ph="AI 생성 or 직접 작성" />
        <Field label="논의 주제" value={topics} onChange={setTopics} rows={5} ph="AI 생성 or 직접 작성" />
        <Field label="확인·점검할 것" value={checks} onChange={setChecks} rows={4} ph="로그에서 관찰된 패턴 기반" />
        <Field label="던질 질문" value={questions} onChange={setQuestions} rows={4} ph="세션에서 물어볼 것" />
        <Field label="코치 메모" value={memo} onChange={setMemo} rows={3} ph="세션 중/전 자유 메모" />
      </div>

      <button type="button" onClick={save} disabled={saving}
        className="w-full bg-navy text-white text-[15px] font-bold py-3.5 rounded-xl active:opacity-90 disabled:opacity-60">
        {saving ? "저장 중…" : saved ? "저장됨 ✓" : "가이드 저장"}
      </button>
    </div>
  );
}
