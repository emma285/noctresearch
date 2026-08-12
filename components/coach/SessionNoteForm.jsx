"use client";
// 코치 세션노트 (2겹). 상세 노트(내부) + 공개 노트(간략 3칸). 세션 녹음 업로드.
// 저장은 "저장" 하나, 공개 여부는 "선수에게 공개" 토글로만 결정. (디자인 시스템 v2)
import { useState, useRef } from "react";
import Link from "next/link";
import { upload } from "@vercel/blob/client";
import { ChevronLeft, Eye, Mic, Lock } from "lucide-react";
import { cn } from "../../lib/utils";

const DOW = ["일", "월", "화", "수", "목", "금", "토"];

// 상세 노트(내부) 섹션 — 포맷은 계속 다듬을 수 있게 라벨만 고정.
const SECTIONS = [
  { k: "chief", label: "주요 호소", ph: "선수가 직접 한 말 위주로…" },
  { k: "status", label: "현재 상태", ph: "훈련일/휴식일 수면 패턴…" },
  { k: "hypothesis", label: "가설 (원인 구조)", ph: "조건화·리듬·각성 등…" },
  { k: "plan", label: "이번 주 처방", ph: "합의한 실천·근거…" },
  { k: "next", label: "다음 세션", ph: "날짜·다룰 것·관찰 포인트…" },
  { k: "memo", label: "코치 메모", ph: "기질·주의·아이디어…" },
];

// 모듈 레벨 — 안에 두면 매 렌더 remount되어 textarea 포커스가 풀림.
function TA({ value, onChange, rows = 3, ph }) {
  return (
    <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows} placeholder={ph}
      className="w-full rounded-xl border border-border bg-card p-3 text-[14.5px] leading-relaxed resize-none focus:outline-none focus:border-primary font-sans" />
  );
}
function Lbl({ children }) {
  return <div className="mt-4 mb-1.5"><span className="text-[13px] font-bold text-navy">{children}</span></div>;
}

export default function SessionNoteForm({ session }) {
  const d0 = session.detail || {};
  const [tab, setTab] = useState("detail"); // detail | public
  const [detail, setDetail] = useState(() => Object.fromEntries(SECTIONS.map((s) => [s.k, d0[s.k] || ""])));
  const [summary, setSummary] = useState(session.summary || "");
  const [actions, setActions] = useState((session.actions || []).join("\n"));
  const [comment, setComment] = useState(session.comment || "");
  const [published, setPublished] = useState(!!session.published);
  const [audioUrl, setAudioUrl] = useState(session.audioUrl || "");
  const [audioName, setAudioName] = useState(session.audioUrl ? decodeURIComponent(session.audioUrl.split("/").pop().split("?")[0]) : "");
  const [dragOver, setDragOver] = useState(false);
  const [upPct, setUpPct] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const fileRef = useRef(null);

  const setD = (k, v) => setDetail((p) => ({ ...p, [k]: v }));
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(session.date || "");
  const dateLabel = m ? `${+m[2]}월 ${+m[3]}일 (${DOW[new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])).getUTCDay()]})` : "";
  const title = session.n ? `${session.n}회차 코칭 세션` : (session.title || "코칭 세션");

  async function doUpload(file) {
    if (!file) return;
    if (!/audio\//.test(file.type) && !/\.(m4a|mp3|wav|aac|ogg)$/i.test(file.name)) { alert("오디오 파일만 올릴 수 있어요."); return; }
    setAudioName(file.name);
    setUpPct(0);
    try {
      const b = await upload(file.name, file, {
        access: "private",
        handleUploadUrl: "/api/upload",
        onUploadProgress: (ev) => setUpPct(Math.min(99, Math.round(ev?.percentage ?? 0))),
      });
      setAudioUrl(b.url);
      setUpPct(null);
      // 녹음 URL만 즉시 저장
      fetch("/api/coach/session-note", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: session.id, audioUrl: b.url }) }).catch(() => {});
    } catch (err) {
      alert("업로드 실패: " + (err?.message || ""));
      setUpPct(null);
    }
    if (fileRef.current) fileRef.current.value = "";
  }
  const onPickAudio = (e) => doUpload(e.target.files?.[0]);
  const onDrop = (e) => { e.preventDefault(); setDragOver(false); doUpload(e.dataTransfer.files?.[0]); };

  async function save() {
    setSaving(true); setSaved(false);
    try {
      const r = await fetch("/api/coach/session-note", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: session.id, detail, summary, actions: actions.split("\n"), comment, published }),
      });
      const j = await r.json();
      if (j.success) { setSaved(true); setTimeout(() => setSaved(false), 2000); }
      else alert(j.message || "저장 실패");
    } catch { alert("네트워크 오류"); }
    setSaving(false);
  }

  return (
    <div className="min-h-[100dvh] bg-background mx-auto w-full max-w-[520px] pb-[calc(84px+env(safe-area-inset-bottom))]">
      <div className="px-4 pt-[calc(env(safe-area-inset-top)+14px)] pb-2 flex items-center gap-3 border-b border-border">
        <Link href="/portal" className="w-9 h-9 -ml-1.5 rounded-lg flex items-center justify-center active:bg-muted"><ChevronLeft className="w-6 h-6" /></Link>
        <div className="min-w-0 flex-1">
          <h1 className="text-[18px] font-bold tracking-[-0.3px] leading-tight">{title} · 코칭 노트</h1>
          {dateLabel ? <div className="text-[13px] text-muted-foreground">{dateLabel}</div> : null}
        </div>
        <Link href={`/session/${session.id}`} target="_blank" className="flex items-center gap-1.5 text-[13px] font-semibold text-primary px-2.5 py-1.5 rounded-lg bg-primary/10"><Eye className="w-4 h-4" />선수 화면</Link>
      </div>

      <div className="px-5 py-5">
        {/* 세션 녹음 업로드 (드래그드롭 + 클릭) */}
        {audioUrl && upPct === null ? (
          <div className="flex items-center gap-3 border border-border rounded-xl p-3 bg-card">
            <span className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0"><Mic className="w-[18px] h-[18px]" /></span>
            <div className="flex-1 min-w-0">
              <div className="text-[14px] font-semibold text-foreground truncate">{audioName || "세션 녹음"}</div>
              <div className="text-[12px] text-muted-foreground mt-0.5">업로드 완료</div>
            </div>
            <button type="button" onClick={() => fileRef.current?.click()} className="text-[12.5px] font-bold text-primary shrink-0">다시 업로드</button>
          </div>
        ) : (
          <button type="button" onClick={() => fileRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            className={cn("w-full flex flex-col items-center gap-2 rounded-xl border-2 border-dashed py-7 px-4 transition-colors", dragOver ? "border-primary bg-primary/5" : "border-border bg-card")}>
            <span className="w-11 h-11 rounded-full bg-primary/10 text-primary flex items-center justify-center"><Mic className="w-5 h-5" /></span>
            {upPct !== null ? (
              <div className="text-[13px] font-semibold text-primary">업로드 중… {upPct}%</div>
            ) : (
              <>
                <div className="text-[14px] font-semibold text-foreground">세션 녹음을 끌어다 놓거나 눌러서 업로드</div>
                <div className="text-[12px] text-muted-foreground">m4a · mp3 · wav</div>
              </>
            )}
          </button>
        )}
        <input ref={fileRef} type="file" accept="audio/*,.m4a" hidden onChange={onPickAudio} />

        {/* 탭 */}
        <div className="flex bg-background border border-border rounded-xl p-[3px] mt-4">
          <button type="button" onClick={() => setTab("detail")} className={cn("flex-1 py-2.5 rounded-[9px] text-[13px] font-bold", tab === "detail" ? "bg-card text-primary shadow-sm" : "text-muted-foreground")}>상세 노트</button>
          <button type="button" onClick={() => setTab("public")} className={cn("flex-1 py-2.5 rounded-[9px] text-[13px] font-bold", tab === "public" ? "bg-card text-primary shadow-sm" : "text-muted-foreground")}>공개 노트</button>
        </div>

        {tab === "detail" ? (
          <div>
            <p className="text-[12px] text-muted-foreground mt-3 flex items-center gap-1.5"><Lock className="w-3.5 h-3.5" />내부 전용 · 선수에게 안 보여요</p>
            {SECTIONS.map((s) => (
              <div key={s.k}>
                <Lbl>{s.label}</Lbl>
                <TA value={detail[s.k]} onChange={(v) => setD(s.k, v)} rows={s.k === "plan" ? 4 : 2} ph={s.ph} />
              </div>
            ))}
          </div>
        ) : (
          <div>
            <Lbl>① 세션 요약</Lbl>
            <TA value={summary} onChange={setSummary} rows={3} ph="이번 세션에서 함께 본 것을 짧게…" />
            <Lbl>② 이번 주 함께 해볼 것</Lbl>
            <TA value={actions} onChange={setActions} rows={4} ph={"매일 같은 시각에 일어나기\n자기 전 90분 카페인 마무리"} />
            <Lbl>③ 코치 한마디</Lbl>
            <TA value={comment} onChange={setComment} rows={3} ph="응원·당부 한마디…" />
            <div className="flex items-center justify-between bg-card border border-border rounded-xl p-3.5 mt-4">
              <div><div className="text-[14px] font-semibold text-foreground">선수에게 공개</div><div className="text-[12px] text-muted-foreground mt-0.5">켜면 선수 앱 지난 세션에 노출</div></div>
              <button type="button" onClick={() => setPublished((v) => !v)} className={cn("w-[46px] h-[27px] rounded-full relative transition-colors shrink-0", published ? "bg-accent" : "bg-[#d3d7df]")}>
                <span className={cn("absolute w-[21px] h-[21px] rounded-full bg-white top-[3px] transition-all", published ? "right-[3px]" : "left-[3px]")} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 저장 (하단 고정) — 저장은 저장만, 공개는 토글로 */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[520px] px-5 pt-3 pb-[calc(env(safe-area-inset-bottom)+16px)] bg-background/95 backdrop-blur border-t border-border">
        <button type="button" onClick={save} disabled={saving}
          className="w-full bg-primary text-white text-base font-semibold py-4 rounded-xl active:opacity-90 disabled:opacity-60">
          {saving ? "저장 중…" : saved ? "저장됨 ✓" : "저장"}
        </button>
      </div>
    </div>
  );
}
