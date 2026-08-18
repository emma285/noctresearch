"use client";
// 세션 가이드(세션 전 준비) — 타임라인 + 코치 논의 입력 + AI 생성 + 편집 + 메모 + 저장.
// readOnly=true(세션 종료: 노트 있음/공개됨) → 작성 비활성화, 만들어둔 가이드만 읽기전용 표시.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Lock } from "lucide-react";
import LogTimelinePanel from "./LogTimelinePanel";

const TA = ({ value, onChange, rows = 3, ph, readOnly }) => (
  <textarea value={value} onChange={readOnly ? undefined : (e) => onChange(e.target.value)} rows={rows} placeholder={ph} readOnly={readOnly}
    style={{ fontFamily: "inherit" }}
    className={`w-full rounded-xl border p-3 text-[14.5px] resize-y leading-relaxed ${readOnly ? "border-border/70 bg-muted/40 text-foreground/90 cursor-default" : "border-border bg-card text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:border-primary"}`} />
);

function Field({ label, value, onChange, rows, ph, readOnly }) {
  if (readOnly && !value) return null; // 읽기전용에선 빈 섹션 숨김
  return (
    <div>
      <div className="text-[13px] font-bold text-navy mb-1.5">{label}</div>
      <TA value={value} onChange={onChange} rows={rows} ph={ph} readOnly={readOnly} />
    </div>
  );
}

export default function SessionGuideForm({ session, timeline, targets = [], targetSummary = null, readOnly = false, hasNote = false, onViewNote }) {
  const router = useRouter();
  const g0 = session.guide || {};
  const isFollowup = (session.n || 1) > 1;
  const [discuss, setDiscuss] = useState(g0.discuss || "");
  const [review, setReview] = useState(g0.review || "");
  const [goal, setGoal] = useState(g0.goal || "");
  const [topics, setTopics] = useState(g0.topics || "");
  const [checks, setChecks] = useState(g0.checks || "");
  const [questions, setQuestions] = useState(g0.questions || "");
  const [memo, setMemo] = useState(g0.memo || "");
  const [gen, setGen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const hasGuideContent = !!(review || goal || topics || checks || questions || memo);

  async function generate() {
    setGen(true);
    try {
      const r = await fetch("/api/coach/session-guide", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: session.id, action: "generate", discuss }),
      }).then((r) => r.json());
      if (r.success && r.guide) { setReview(r.guide.review || ""); setGoal(r.guide.goal || ""); setTopics(r.guide.topics || ""); setChecks(r.guide.checks || ""); setQuestions(r.guide.questions || ""); router.refresh(); }
      else alert(r.message || "생성 실패");
    } catch (e) { alert("생성 실패: " + e.message); }
    setGen(false);
  }
  async function save() {
    setSaving(true); setSaved(false);
    try {
      const r = await fetch("/api/coach/session-guide", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: session.id, action: "save", guide: { discuss, review, goal, topics, checks, questions, memo } }),
      }).then((r) => r.json());
      if (r.success) { setSaved(true); setTimeout(() => setSaved(false), 2000); router.refresh(); } else alert(r.message || "저장 실패");
    } catch (e) { alert("저장 실패: " + e.message); }
    setSaving(false);
  }

  return (
    <div className="space-y-6">
      {/* 1) 수면·루틴 패턴 */}
      <section>
        <div className="text-[13px] font-bold text-navy mb-2">수면·루틴 패턴 <span className="text-muted-foreground font-medium">· 최근 로그 (수면은 전날 밤 기준)</span></div>
        <LogTimelinePanel cols={timeline?.cols || []} sleeps={timeline?.sleeps || []} routines={timeline?.routines || []} targets={targets} summary={targetSummary} compactHeight={360} />
      </section>

      <div className="max-w-[760px] space-y-6">
        {readOnly ? (
          /* ── 세션 종료: 작성 비활성화, 만들어둔 가이드만 읽기전용 ── */
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 text-[12.5px] font-bold text-muted-foreground bg-muted rounded-full px-3 py-1.5"><Lock className="w-3.5 h-3.5" />세션 종료 · 가이드 읽기 전용</span>
            {hasNote && onViewNote ? <button type="button" onClick={onViewNote} className="text-[12.5px] font-bold text-primary bg-primary/10 rounded-full px-3 py-1.5">코칭 노트 보기 →</button> : null}
          </div>
        ) : (
          /* 2) 코치 논의 입력 + AI 생성 */
          <section className="space-y-2">
            <Field label="이번 세션에서 논의할 것 (코치 입력)" value={discuss} onChange={setDiscuss} rows={6} ph="예: 8/13 입면 30분 걸린 이유 · 카페인 타이밍 · 원정 앞두고 리듬 점검…" />
            <button type="button" onClick={generate} disabled={gen}
              className="inline-flex items-center gap-1.5 bg-primary text-white text-[14px] font-bold px-4 py-2.5 rounded-xl active:opacity-90 disabled:opacity-60">
              <Sparkles className="w-4 h-4" viewBox="0 0 24 24" />{gen ? "AI가 가이드 만드는 중…" : "AI 가이드 생성"}
            </button>
            <p className="text-[12px] text-muted-foreground">위 타임라인 패턴 + 논의 포인트{isFollowup ? " + 지난 세션 전사·처방(이행 점검)" : ""}을 읽고 아래 섹션을 채워요. 생성 후 자유롭게 수정하세요.</p>
          </section>
        )}

        {/* 3) 가이드 섹션 */}
        {readOnly && !hasGuideContent ? (
          <div className="bg-muted/40 border border-border rounded-xl py-10 text-center text-[13px] text-muted-foreground">
            이 세션은 가이드를 작성하지 않았어요.
            {hasNote ? <div className="mt-2 text-foreground/80">대신 세션 후 <button type="button" onClick={onViewNote} className="font-bold text-primary underline underline-offset-2">코칭 노트</button>가 작성돼 있어요.</div> : null}
          </div>
        ) : (
          <div className="space-y-4">
            {isFollowup ? <Field label="지난 세션 이행 점검" value={review} onChange={setReview} rows={9} ph="지난 세션에 하기로 한 것 → 로그·전사 기반 '했음/부분/안 함' 판정" readOnly={readOnly} /> : null}
            <Field label="이번 세션 목표" value={goal} onChange={setGoal} rows={4} ph="AI 생성 or 직접 작성" readOnly={readOnly} />
            <Field label="논의 주제" value={topics} onChange={setTopics} rows={14} ph="AI 생성 or 직접 작성" readOnly={readOnly} />
            <Field label="확인·점검할 것" value={checks} onChange={setChecks} rows={9} ph="로그에서 관찰된 패턴 기반" readOnly={readOnly} />
            <Field label="던질 질문" value={questions} onChange={setQuestions} rows={9} ph="세션에서 물어볼 것" readOnly={readOnly} />
            <Field label="코치 메모" value={memo} onChange={setMemo} rows={6} ph="세션 중/전 자유 메모" readOnly={readOnly} />
          </div>
        )}

        {readOnly ? null : (
          <button type="button" onClick={save} disabled={saving}
            className="w-full bg-navy text-white text-[15px] font-bold py-3.5 rounded-xl active:opacity-90 disabled:opacity-60">
            {saving ? "저장 중…" : saved ? "저장됨 ✓" : "가이드 저장"}
          </button>
        )}
      </div>
    </div>
  );
}
