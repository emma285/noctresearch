"use client";

// 코칭 준비 자료 — 토스 스타일. 타입 칩 선택 → 자유 입력 → 추가. 파일 첨부. 코치에게 전송.
import { useState, useRef } from "react";
import { upload } from "@vercel/blob/client";
import { useRouter } from "next/navigation";

const TYPES = [
  { key: "경기·대회", emoji: "🏆", ph: "예: 8/15(금) 오전 9시 티오프 · ○○ 오픈 1라운드" },
  { key: "원정·비행", emoji: "✈️", ph: "예: 8/12 14:00 인천 출발 → LA 도착(시차 −16h), 8/20 귀국" },
  { key: "훈련 일정", emoji: "🏋️", ph: "예: 평일 오전 6~9시 필드, 화·목 저녁 웨이트" },
  { key: "메모", emoji: "📝", ph: "코치가 알면 좋을 내용 아무거나 편하게" },
];

export default function PrepForm({ name }) {
  const router = useRouter();
  const [type, setType] = useState("경기·대회");
  const [text, setText] = useState("");
  const [items, setItems] = useState([]);
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const fileRef = useRef(null);

  const cur = TYPES.find((t) => t.key === type);
  const emojiOf = (k) => (TYPES.find((t) => t.key === k)?.emoji || "•");

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

  async function onFiles(e) {
    const list = Array.from(e.target.files || []);
    if (!list.length) return;
    setUploading(true);
    try {
      for (const file of list) {
        const b = await upload(file.name, file, { access: "public", handleUploadUrl: "/api/upload" });
        setFiles((p) => [...p, { name: file.name, url: b.url }]);
      }
    } catch (err) {
      alert("업로드에 실패했어요: " + err.message);
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
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
      <main className="min-h-screen bg-[#F7F8FA] flex flex-col items-center justify-center px-6 text-center" style={{ fontFamily: "'Pretendard',sans-serif" }}>
        <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mb-5 text-3xl">✅</div>
        <h1 className="text-[22px] font-extrabold text-gray-900 mb-2">코치에게 전달됐어요</h1>
        <p className="text-[15px] text-gray-500 leading-relaxed mb-8">보내주신 일정으로 맞춤 코칭을<br />준비할게요. 곧 만나요 😊</p>
        <button onClick={() => router.push("/portal")}
          className="w-full max-w-xs py-4 rounded-2xl bg-blue-600 text-white font-bold text-base active:scale-[0.99] transition-transform">
          내 코칭 공간으로
        </button>
      </main>
    );
  }

  const empty = items.length === 0 && files.length === 0;

  return (
    <main className="min-h-screen bg-[#F7F8FA] pb-28" style={{ fontFamily: "'Pretendard',sans-serif" }}>
      <div className="max-w-md mx-auto px-5 pt-8">
        {/* 헤더 */}
        <h1 className="text-[24px] font-extrabold text-gray-900 leading-snug tracking-[-0.02em]">
          코칭 준비 자료
        </h1>
        <p className="text-[15px] text-gray-500 mt-2 leading-relaxed">
          {name ? `${name}님, ` : ""}코칭 전에 일정을 알려주시면<br />그걸로 맞춤 계획을 짜서 준비해요.
        </p>

        {/* 입력 카드 */}
        <div className="mt-6 bg-white rounded-3xl p-5 shadow-[0_2px_16px_rgba(0,0,0,0.04)]">
          {/* 타입 칩 */}
          <div className="flex gap-2 overflow-x-auto -mx-1 px-1 pb-1" style={{ scrollbarWidth: "none" }}>
            {TYPES.map((t) => {
              const on = t.key === type;
              return (
                <button key={t.key} type="button" onClick={() => setType(t.key)}
                  className={`shrink-0 px-4 py-2 rounded-full text-sm font-bold transition-colors ${on ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-500"}`}>
                  <span className="mr-1">{t.emoji}</span>{t.key}
                </button>
              );
            })}
          </div>

          {/* 입력 */}
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={cur?.ph}
            rows={3}
            className="mt-4 w-full bg-[#F7F8FA] rounded-2xl p-4 text-[15px] text-gray-900 outline-none resize-none placeholder:text-gray-400 focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all"
          />
          <button type="button" onClick={addItem} disabled={!text.trim()}
            className="mt-3 w-full py-3.5 rounded-2xl bg-gray-900 text-white font-bold text-[15px] disabled:bg-gray-200 disabled:text-gray-400 active:scale-[0.99] transition-all">
            추가하기
          </button>
        </div>

        {/* 추가된 항목 리스트 */}
        {items.length > 0 && (
          <div className="mt-4 flex flex-col gap-2">
            {items.map((it, i) => (
              <div key={i} className="bg-white rounded-2xl px-4 py-3.5 flex items-start gap-3 shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
                <span className="text-lg leading-6">{emojiOf(it.type)}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-bold text-blue-600 mb-0.5">{it.type}</div>
                  <div className="text-[15px] text-gray-800 leading-relaxed whitespace-pre-wrap break-words">{it.text}</div>
                </div>
                <button onClick={() => removeItem(i)} className="text-gray-300 hover:text-gray-500 text-xl leading-5 px-1">×</button>
              </div>
            ))}
          </div>
        )}

        {/* 파일 첨부 */}
        <div className="mt-4 bg-white rounded-3xl p-5 shadow-[0_2px_16px_rgba(0,0,0,0.04)]">
          <div className="text-[15px] font-bold text-gray-900">사진·파일 첨부</div>
          <div className="text-[13px] text-gray-400 mt-1">팀 스케줄표, 항공권, 훈련 계획 캡처 등</div>
          <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
            className="mt-3 w-full py-3.5 rounded-2xl bg-blue-50 text-blue-600 font-bold text-[15px] active:scale-[0.99] transition-all disabled:opacity-60">
            {uploading ? "올리는 중…" : "＋ 파일 올리기"}
          </button>
          <input ref={fileRef} type="file" accept="image/*,application/pdf" multiple onChange={onFiles} className="hidden" />
          {files.length > 0 && (
            <div className="mt-3 flex flex-col gap-2">
              {files.map((f, i) => (
                <div key={i} className="flex items-center gap-2 bg-[#F7F8FA] rounded-xl px-3 py-2.5">
                  <span className="text-base">📎</span>
                  <a href={f.url} target="_blank" rel="noreferrer" className="flex-1 min-w-0 truncate text-[14px] text-gray-700">{f.name}</a>
                  <button onClick={() => removeFile(i)} className="text-gray-300 hover:text-gray-500 text-lg px-1">×</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 하단 고정 CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-[#F7F8FA] via-[#F7F8FA] to-transparent pt-6 pb-5 px-5">
        <div className="max-w-md mx-auto">
          <button onClick={submit} disabled={empty || loading}
            className="w-full py-4 rounded-2xl bg-blue-600 text-white font-bold text-[16px] disabled:bg-gray-200 disabled:text-gray-400 active:scale-[0.99] transition-all">
            {loading ? "보내는 중…" : empty ? "일정을 추가해 주세요" : "코치에게 보내기"}
          </button>
        </div>
      </div>
    </main>
  );
}
