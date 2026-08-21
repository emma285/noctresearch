"use client";
// 코치 세션노트 (2겹). 상세 노트(내부) + 공개 노트(간략 3칸). 세션 녹음 업로드.
// 저장은 "저장" 하나, 공개 여부는 "선수에게 공개" 토글로만 결정. (디자인 시스템 v2)
import { useState, useRef, useLayoutEffect, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { upload } from "@vercel/blob/client";
import { ChevronLeft, Eye, Mic, Lock, Sparkles } from "lucide-react";
import { cn } from "../../lib/utils";

const DOW = ["일", "월", "화", "수", "목", "금", "토"];

// 상세 노트(내부) 섹션 — 포맷은 계속 다듬을 수 있게 라벨만 고정.
const SECTIONS = [
  { k: "chief", label: "주요 호소", ph: "선수가 직접 한 말 위주로…" },
  { k: "review", label: "지난 주 리뷰 (한 것·못 한 것)", ph: "지난 세션 실천 중 한 것/못 한 것·반응 (1회차면 비움)" },
  { k: "status", label: "현재 상태", ph: "훈련일/휴식일 수면 패턴…" },
  { k: "hypothesis", label: "가설 (원인 구조)", ph: "조건화·리듬·각성 등…" },
  { k: "plan", label: "이번 주 처방", ph: "합의한 실천·근거…" },
  { k: "next", label: "다음 세션", ph: "날짜·다룰 것·관찰 포인트…" },
  { k: "memo", label: "코치 메모", ph: "기질·주의·아이디어…" },
];

// 모듈 레벨 — 안에 두면 매 렌더 remount되어 포커스가 풀림.
// 공개 노트용 일반 textarea (자동 높이).
function TA({ value, onChange, ph }) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (el) { el.style.height = "auto"; el.style.height = el.scrollHeight + "px"; }
  }, [value]);
  return (
    <textarea ref={ref} value={value} onChange={(e) => onChange(e.target.value)} rows={1} placeholder={ph}
      className="w-full rounded-xl border border-border bg-card p-3 text-[14.5px] leading-relaxed resize-none overflow-hidden focus:outline-none focus:border-primary font-sans" />
  );
}

// 상세 노트용 리치 에디터: 선택 후 Cmd/Ctrl+B로 볼드. 줄바꿈·넘버링 그대로 표시.
// uncontrolled(마운트 때만 innerHTML 세팅) → 편집 중 커서 유지. 내용에 맞춰 높이 자동.
function RichTA({ value, onChange, ph }) {
  const ref = useRef(null);
  const inited = useRef(false);
  useLayoutEffect(() => {
    if (ref.current && !inited.current) { ref.current.innerHTML = value || ""; inited.current = true; }
  }, [value]);
  const emit = () => onChange(ref.current?.innerHTML || "");
  const onKeyDown = (e) => {
    if ((e.metaKey || e.ctrlKey) && (e.key === "b" || e.key === "B")) { e.preventDefault(); document.execCommand("bold"); emit(); }
  };
  return (
    <div ref={ref} contentEditable suppressContentEditableWarning onInput={emit} onKeyDown={onKeyDown} data-ph={ph || ""}
      className="w-full rounded-xl border border-border bg-card p-3 text-[14.5px] leading-relaxed whitespace-pre-wrap focus:outline-none focus:border-primary font-sans min-h-[46px] empty:before:content-[attr(data-ph)] empty:before:text-muted-foreground" />
  );
}
function Lbl({ children }) {
  return <div className="mt-4 mb-1.5"><span className="text-[13px] font-bold text-navy">{children}</span></div>;
}

export default function SessionNoteForm({ session, extras = [] }) {
  const d0 = session.detail || {};
  const slugOf = (url) => (String(url).split("?")[0].split("/").pop() || "").replace(/\.html?$/i, "");
  const [tab, setTab] = useState("detail"); // detail | public
  const [detail, setDetail] = useState(() => Object.fromEntries(SECTIONS.map((s) => [s.k, d0[s.k] || ""])));
  const [attachments, setAttachments] = useState(Array.isArray(d0.attachments) ? d0.attachments : []);
  const toggleAttach = (slug) => setAttachments((a) => (a.includes(slug) ? a.filter((x) => x !== slug) : [...a, slug]));
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
  const router = useRouter();

  // 생성 중 = 녹음 올렸는데 아직 노트 안 채워짐(로컬 프로세서가 5분 폴링으로 채움).
  const generating = !!audioUrl && upPct === null && !detail.chief && !summary;
  // 생성 중이면 15초마다 서버 데이터 새로고침 → 완료(chief 등장) 감지 시 폼 리로드해 내용 반영.
  useEffect(() => {
    if (!generating) return;
    const iv = setInterval(() => router.refresh(), 15000);
    return () => clearInterval(iv);
  }, [generating, router]);
  useEffect(() => {
    if (audioUrl && !detail.chief && !summary && (session.detail?.chief || session.summary)) window.location.reload();
  }, [session.detail?.chief, session.summary]); // eslint-disable-line react-hooks/exhaustive-deps

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
        body: JSON.stringify({ id: session.id, detail: { ...detail, attachments }, summary, actions: actions.split("\n"), comment, published }),
      });
      const j = await r.json();
      if (j.success) { setSaved(true); setTimeout(() => setSaved(false), 2000); }
      else alert(j.message || "저장 실패");
    } catch { alert("네트워크 오류"); }
    setSaving(false);
  }

  return (
    <>
      <div className="px-5 pt-4 pb-5">
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

        {/* AI 노트 생성 중 배너 — 녹음 올렸고 아직 노트 안 채워짐 */}
        {generating ? (
          <div className="mt-4 flex items-center gap-3 rounded-xl border border-primary/25 bg-primary/[0.06] p-3.5">
            <span className="w-9 h-9 rounded-lg bg-primary/12 text-primary flex items-center justify-center shrink-0">
              <Sparkles className="w-[18px] h-[18px] animate-pulse" />
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-[14px] font-bold text-primary">AI가 코칭 노트를 작성하고 있어요</div>
              <div className="text-[12.5px] text-muted-foreground mt-0.5">전사 + 초안까지 최대 5분 · 다 되면 자동으로 채워져요</div>
            </div>
          </div>
        ) : null}

        {/* 탭 */}
        <div className="flex bg-background border border-border rounded-xl p-[3px] mt-4">
          <button type="button" onClick={() => setTab("detail")} className={cn("flex-1 py-2.5 rounded-[9px] text-[13px] font-bold", tab === "detail" ? "bg-card text-primary shadow-sm" : "text-muted-foreground")}>상세 노트</button>
          <button type="button" onClick={() => setTab("public")} className={cn("flex-1 py-2.5 rounded-[9px] text-[13px] font-bold", tab === "public" ? "bg-card text-primary shadow-sm" : "text-muted-foreground")}>공개 노트</button>
        </div>

        {tab === "detail" ? (
          <div>
            <p className="text-[12px] text-muted-foreground mt-3 flex items-center gap-1.5"><Lock className="w-3.5 h-3.5" />내부 전용 · 선수에게 안 보여요 · 선택 후 <b className="text-foreground">⌘B</b>로 볼드</p>
            {SECTIONS.map((s) => (
              <div key={s.k}>
                <Lbl>{s.label}</Lbl>
                <RichTA value={detail[s.k]} onChange={(v) => setD(s.k, v)} ph={s.ph} />
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

            {extras.length > 0 ? (
              <>
                <Lbl>④ 선수에게 보낼 자료</Lbl>
                <div className="rounded-xl border border-border bg-card divide-y divide-border overflow-hidden">
                  {extras.map((e) => {
                    const slug = slugOf(e.url);
                    const on = attachments.includes(slug);
                    return (
                      <button key={slug} type="button" onClick={() => toggleAttach(slug)} className="w-full flex items-center gap-3 p-3.5 text-left active:bg-muted/40">
                        <span className={cn("w-5 h-5 rounded-md border flex items-center justify-center shrink-0 text-white text-[13px] font-black", on ? "bg-primary border-primary" : "border-[#c3cbe8]")}>{on ? "✓" : ""}</span>
                        <span className="min-w-0"><span className="block text-[14px] font-bold text-navy truncate">{e.label}</span>{e.desc ? <span className="block text-[12px] text-muted-foreground truncate">{e.desc}</span> : null}</span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-[12px] text-muted-foreground mt-1.5">선택한 자료가 이 세션 노트 + 선수 리포트 탭에 링크로 떠요.</p>
              </>
            ) : null}

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
    </>
  );
}
