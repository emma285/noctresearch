"use client";

// 코칭 준비 자료 — NOCT 톤(인디고 #4355B0 / 스카이 #7EC8E3, 네이비), 이모지 없음, UX는 토스풍.
import { useState, useRef } from "react";
import { upload } from "@vercel/blob/client";
import { useRouter } from "next/navigation";
import { ArrowLeft, Camera, ImagePlus, X, Check, Paperclip } from "lucide-react";

const GRAD = "linear-gradient(90deg,#4355B0,#7EC8E3)";
const INDIGO = "#4355B0";

const TYPES = [
  { key: "경기·대회", ph: "예: 8/15(금) 오전 9시 티오프, ○○ 오픈 1라운드" },
  { key: "원정·비행", ph: "예: 8/12 14:00 인천 출발 → LA 도착(시차 −16h), 8/20 귀국" },
  { key: "훈련 일정", ph: "예: 평일 오전 6~9시 필드, 화·목 저녁 웨이트" },
  { key: "메모", ph: "코치가 알면 좋을 내용을 편하게 적어 주세요" },
];

function Header({ onBack }) {
  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-5 py-3.5 bg-white/90 backdrop-blur-md border-b border-gray-100">
      <img src="/noct-logo.png" alt="NOCT Research" className="h-5 w-auto" />
      <button onClick={onBack} className="flex items-center gap-1 text-sm font-medium text-gray-500 active:text-gray-700">
        <ArrowLeft className="w-4 h-4" /> 포털
      </button>
    </div>
  );
}

export default function PrepForm({ name }) {
  const router = useRouter();
  const [type, setType] = useState("경기·대회");
  const [text, setText] = useState("");
  const [items, setItems] = useState([]);
  const [files, setFiles] = useState([]);
  const [uploadPct, setUploadPct] = useState(null); // null = 업로드 중 아님
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const albumRef = useRef(null);
  const cameraRef = useRef(null);

  const cur = TYPES.find((t) => t.key === type);

  function addItem() {
    const t = text.trim();
    if (!t) return;
    setItems((p) => [...p, { type, text: t }]);
    setText("");
  }
  function onKeyDown(e) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); addItem(); }
  }
  const removeItem = (i) => setItems((p) => p.filter((_, idx) => idx !== i));

  async function doUpload(list) {
    if (!list.length) return;
    setUploadPct(0);
    try {
      for (const file of list) {
        const b = await upload(file.name, file, {
          access: "public",
          handleUploadUrl: "/api/upload",
          onUploadProgress: (ev) => setUploadPct(Math.round(ev?.percentage ?? 0)),
        });
        setFiles((p) => [...p, { name: file.name, url: b.url }]);
      }
    } catch (err) {
      alert("업로드에 실패했어요: " + err.message);
    } finally {
      setUploadPct(null);
      if (albumRef.current) albumRef.current.value = "";
      if (cameraRef.current) cameraRef.current.value = "";
    }
  }
  const removeFile = (i) => setFiles((p) => p.filter((_, idx) => idx !== i));

  async function submit() {
    if (!items.length && !files.length) return;
    setLoading(true);
    try {
      const res = await fetch("/api/prep", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items, files }),
      });
      const j = await res.json();
      if (j.success) setDone(true);
      else alert(j.message || "전송에 실패했어요.");
    } catch {
      alert("네트워크 오류가 발생했어요.");
    }
    setLoading(false);
  }

  if (done) {
    return (
      <main className="min-h-screen bg-[#F2F3F6] flex flex-col items-center justify-center px-6 text-center" style={{ fontFamily: "'Pretendard',sans-serif" }}>
        <div className="w-16 h-16 rounded-full flex items-center justify-center mb-5" style={{ background: GRAD }}>
          <Check className="w-8 h-8 text-white" strokeWidth={3} />
        </div>
        <h1 className="text-[22px] font-extrabold text-[#0D1B2A] mb-2">코치에게 전달됐어요</h1>
        <p className="text-[15px] text-gray-500 leading-relaxed mb-8">보내주신 일정으로 맞춤 코칭을<br />준비할게요.</p>
        <button onClick={() => router.push("/portal")}
          className="w-full max-w-xs py-4 rounded-2xl text-white font-bold text-base active:scale-[0.99] transition-transform" style={{ background: GRAD }}>
          포털로 돌아가기
        </button>
      </main>
    );
  }

  const empty = items.length === 0 && files.length === 0;
  const cardShadow = "0 2px 16px rgba(13,27,42,0.05)";

  return (
    <main className="min-h-screen bg-[#F2F3F6] pb-28" style={{ fontFamily: "'Pretendard',sans-serif" }}>
      <Header onBack={() => router.push("/portal")} />

      <div className="max-w-md mx-auto px-5 pt-20">
        {/* 타이틀 */}
        <h1 className="text-[24px] font-extrabold text-[#0D1B2A] leading-snug tracking-[-0.02em]">코칭 준비 자료</h1>
        <p className="text-[15px] text-gray-500 mt-2 leading-relaxed">
          {name ? `${name}님, ` : ""}코칭 전에 일정을 알려주시면<br />그걸로 맞춤 계획을 짜서 준비해요.
        </p>

        {/* ── 입력 블럭 (액션) ── */}
        <div className="mt-6 bg-white rounded-3xl p-5" style={{ boxShadow: cardShadow }}>
          <div className="text-[14px] font-bold text-[#0D1B2A] mb-3">일정·메모 추가</div>
          <div className="flex gap-2 overflow-x-auto -mx-1 px-1 pb-1" style={{ scrollbarWidth: "none" }}>
            {TYPES.map((t) => {
              const on = t.key === type;
              return (
                <button key={t.key} type="button" onClick={() => setType(t.key)}
                  className="shrink-0 px-4 py-2 rounded-full text-sm font-bold transition-colors"
                  style={on ? { background: INDIGO, color: "#fff" } : { background: "#EEF0F5", color: "#6b7280" }}>
                  {t.key}
                </button>
              );
            })}
          </div>
          <textarea
            value={text} onChange={(e) => setText(e.target.value)} onKeyDown={onKeyDown}
            placeholder={cur?.ph} rows={3}
            className="mt-4 w-full bg-[#F2F3F6] rounded-2xl p-4 text-[15px] text-[#0D1B2A] outline-none resize-none placeholder:text-gray-400 focus:bg-white focus:ring-2 transition-all"
            style={{ caretColor: INDIGO }}
          />
          <button type="button" onClick={addItem} disabled={!text.trim()}
            className="mt-3 w-full py-3.5 rounded-2xl font-bold text-[15px] active:scale-[0.99] transition-all disabled:bg-gray-200 disabled:text-gray-400"
            style={!text.trim() ? {} : { background: "#0D1B2A", color: "#fff" }}>
            추가하기
          </button>
        </div>

        {/* ── 추가된 항목 (콘텐츠, 액션 블럭과 구분) ── */}
        {items.length > 0 && (
          <div className="mt-5">
            <div className="text-[13px] font-bold text-gray-400 px-1 mb-2">추가한 항목 {items.length}개</div>
            <div className="flex flex-col gap-2">
              {items.map((it, i) => (
                <div key={i} className="bg-white rounded-2xl px-4 py-3.5 flex items-start gap-3 border border-gray-100">
                  <span className="shrink-0 mt-0.5 px-2 py-0.5 rounded-md text-[11px] font-bold" style={{ background: "#EEF0FB", color: INDIGO }}>{it.type}</span>
                  <div className="flex-1 min-w-0 text-[15px] text-[#0D1B2A] leading-relaxed whitespace-pre-wrap break-words">{it.text}</div>
                  <button onClick={() => removeItem(i)} className="shrink-0 text-gray-300 active:text-gray-500 mt-0.5"><X className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── 파일 첨부 블럭 (액션) ── */}
        <div className="mt-5 bg-white rounded-3xl p-5" style={{ boxShadow: cardShadow }}>
          <div className="text-[14px] font-bold text-[#0D1B2A]">파일 첨부</div>
          <div className="text-[13px] text-gray-400 mt-1 leading-relaxed">
            팀 스케줄표, 항공권, 훈련 계획 등 일정 관련 기록은 스크린샷으로 편하게 올려 주세요.
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => cameraRef.current?.click()} disabled={uploadPct !== null}
              className="flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-[15px] active:scale-[0.99] transition-all disabled:opacity-60"
              style={{ background: "#EEF0FB", color: INDIGO }}>
              <Camera className="w-4 h-4" /> 사진 촬영
            </button>
            <button type="button" onClick={() => albumRef.current?.click()} disabled={uploadPct !== null}
              className="flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-[15px] active:scale-[0.99] transition-all disabled:opacity-60"
              style={{ background: "#EEF0FB", color: INDIGO }}>
              <ImagePlus className="w-4 h-4" /> 앨범·파일
            </button>
          </div>
          <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={(e) => doUpload(Array.from(e.target.files || []))} className="hidden" />
          <input ref={albumRef} type="file" accept="image/*,application/pdf" multiple onChange={(e) => doUpload(Array.from(e.target.files || []))} className="hidden" />

          {/* 업로드 진행 게이지 */}
          {uploadPct !== null && (
            <div className="mt-3">
              <div className="flex justify-between text-[12px] font-semibold text-gray-500 mb-1">
                <span>업로드 중</span><span>{uploadPct}%</span>
              </div>
              <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${uploadPct}%`, background: GRAD }} />
              </div>
            </div>
          )}

          {files.length > 0 && (
            <div className="mt-3 flex flex-col gap-2">
              {files.map((f, i) => (
                <div key={i} className="flex items-center gap-2 bg-[#F2F3F6] rounded-xl px-3 py-2.5">
                  <Paperclip className="w-4 h-4 text-gray-400 shrink-0" />
                  <a href={f.url} target="_blank" rel="noreferrer" className="flex-1 min-w-0 truncate text-[14px] text-gray-700">{f.name}</a>
                  <button onClick={() => removeFile(i)} className="shrink-0 text-gray-300 active:text-gray-500"><X className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 하단 고정 CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-[#F2F3F6] via-[#F2F3F6] to-transparent pt-6 pb-5 px-5">
        <div className="max-w-md mx-auto">
          <button onClick={submit} disabled={empty || loading || uploadPct !== null}
            className="w-full py-4 rounded-2xl text-white font-bold text-[16px] disabled:bg-gray-200 disabled:text-gray-400 active:scale-[0.99] transition-all"
            style={empty || loading || uploadPct !== null ? {} : { background: GRAD }}>
            {loading ? "보내는 중…" : empty ? "일정을 추가해 주세요" : "자료 업로드"}
          </button>
        </div>
      </div>
    </main>
  );
}
