"use client";
// 코치 세션노트 작성 폼 (/coach/session/[id]). 세션 요약·실천 항목·코치 코멘트·공개 토글 → 저장.
// 저장 시 선수의 /session/[id](코칭 노트)에 반영. (디자인 시스템 v2 톤)
import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, Eye } from "lucide-react";
import { cn } from "../../lib/utils";

const DOW = ["일", "월", "화", "수", "목", "금", "토"];

// 모듈 레벨(컴포넌트 밖) — 안에 두면 매 렌더 remount되어 textarea 포커스가 풀림.
function Field({ label, hint, children }) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <label className="text-[14px] font-semibold text-foreground">{label}</label>
        {hint ? <span className="text-[12px] text-muted-foreground">{hint}</span> : null}
      </div>
      <div className="mt-2">{children}</div>
    </div>
  );
}

export default function SessionNoteForm({ session }) {
  const [summary, setSummary] = useState(session.summary || "");
  const [actions, setActions] = useState((session.actions || []).join("\n"));
  const [comment, setComment] = useState(session.comment || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(session.date || "");
  const dateLabel = m ? `${+m[2]}월 ${+m[3]}일 (${DOW[new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])).getUTCDay()]})` : "";
  const title = session.n ? `${session.n}회차 코칭 세션` : (session.title || "코칭 세션");

  async function save() {
    setSaving(true); setSaved(false);
    try {
      const r = await fetch("/api/coach/session-note", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: session.id, summary, actions: actions.split("\n"), comment, published: true }),
      });
      const j = await r.json();
      if (j.success) setSaved(true);
    } catch {}
    setSaving(false);
  }

  return (
    <div className="min-h-[100dvh] bg-background mx-auto w-full max-w-[520px] pb-[calc(80px+env(safe-area-inset-bottom))]">
      <div className="px-4 pt-[calc(env(safe-area-inset-top)+14px)] pb-2 flex items-center gap-3 border-b border-border">
        <Link href="/portal" className="w-9 h-9 -ml-1.5 rounded-lg flex items-center justify-center active:bg-muted"><ChevronLeft className="w-6 h-6" /></Link>
        <div className="min-w-0 flex-1">
          <h1 className="text-[18px] font-bold tracking-[-0.3px] leading-tight">{title} · 코칭 노트</h1>
          {dateLabel ? <div className="text-[13px] text-muted-foreground">{dateLabel}</div> : null}
        </div>
        <Link href={`/session/${session.id}`} target="_blank" className="flex items-center gap-1.5 text-[13px] font-semibold text-primary px-2.5 py-1.5 rounded-lg bg-primary/10"><Eye className="w-4 h-4" />선수 화면</Link>
      </div>

      <div className="px-5 py-6 flex flex-col gap-6">
        <Field label="세션 요약" hint="선수에게 보이는 요약">
          <textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={4} placeholder="이번 세션에서 함께 본 것, 확인한 패턴을 짧게…"
            className="w-full rounded-xl border border-border bg-card p-3.5 text-[15px] leading-relaxed resize-none focus:outline-none focus:border-primary" />
        </Field>

        <Field label="이번 주 함께 해볼 것" hint="한 줄에 하나씩">
          <textarea value={actions} onChange={(e) => setActions(e.target.value)} rows={4} placeholder={"매일 같은 시각에 아침 식사하기\n기상 후 30분 안에 햇빛 보기"}
            className="w-full rounded-xl border border-border bg-card p-3.5 text-[15px] leading-relaxed resize-none focus:outline-none focus:border-primary" />
        </Field>

        <Field label="코치가 전하는 말" hint="응원·당부">
          <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} placeholder="이번 주 무리하지 말고 편하게 해봐요…"
            className="w-full rounded-xl border border-border bg-card p-3.5 text-[15px] leading-relaxed resize-none focus:outline-none focus:border-primary" />
        </Field>

        <p className="text-[13px] text-muted-foreground -mt-1">저장하면 선수 앱의 코칭 노트에 바로 공개돼요.</p>
      </div>

      {/* 저장 (하단 고정) */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[520px] px-5 pt-3 pb-[calc(env(safe-area-inset-bottom)+16px)] bg-background/95 backdrop-blur border-t border-border">
        <button type="button" onClick={save} disabled={saving}
          className="w-full bg-primary text-white text-base font-semibold py-4 rounded-xl active:opacity-90 disabled:opacity-60">
          {saving ? "저장 중…" : saved ? "공개됨 ✓" : "저장하고 공개"}
        </button>
      </div>
    </div>
  );
}
