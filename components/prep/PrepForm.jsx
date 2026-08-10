"use client";
// 코칭 준비 자료 (v2 디자인). 로직(업로드·아이템·제출) 보존. 하단 4탭 유지.
import { useState, useRef } from "react";
import { upload } from "@vercel/blob/client";
import { useRouter } from "next/navigation";
import { ChevronLeft, Camera, ImagePlus, X, Check, Paperclip } from "lucide-react";
import { cn } from "../../lib/utils";
import BottomNav from "../app/BottomNav";

const TYPES = [
  { key: "경기·대회", ph: "예: 8/15(금) 오전 9시 티오프, ○○ 오픈 1라운드" },
  { key: "원정·비행", ph: "예: 8/12 14:00 인천 출발 → LA 도착(시차 −16h), 8/20 귀국" },
  { key: "훈련 일정", ph: "예: 평일 오전 6~9시 필드, 화·목 저녁 웨이트" },
  { key: "메모", ph: "코치가 알면 좋을 내용을 편하게 적어 주세요" },
];

export default function PrepForm({ name }) {
  const router = useRouter();
  const [type, setType] = useState("경기·대회");
  const [text, setText] = useState("");
  const [items, setItems] = useState([]);
  const [files, setFiles] = useState([]);
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const albumRef = useRef(null);
  const cameraRef = useRef(null);
  const idRef = useRef(0);

  const cur = TYPES.find((t) => t.key === type);

  function addItem() {
    const t = text.trim();
    if (!t) return;
    setItems((p) => [...p, { type, text: t }]);
    setText("");
  }
  const removeItem = (i) => setItems((p) => p.filter((_, idx) => idx !== i));

  function doUpload(list) {
    for (const file of list) {
      const id = ++idRef.current;
      setPending((p) => [...p, { id, name: file.name, pct: 0 }]);
      upload(file.name, file, {
        access: "private",
        handleUploadUrl: "/api/upload",
        onUploadProgress: (ev) => setPending((p) => p.map((x) => (x.id === id ? { ...x, pct: Math.min(99, Math.round(ev?.percentage ?? 0)) } : x))),
      })
        .then((b) => {
          setPending((p) => p.map((x) => (x.id === id ? { ...x, pct: 100 } : x)));
          setFiles((f) => [...f, { name: file.name, url: b.url }]);
          setTimeout(() => setPending((p) => p.filter((x) => x.id !== id)), 400);
        })
        .catch((err) => {
          alert("업로드에 실패했어요: " + file.name + "\n" + err.message);
          setPending((p) => p.filter((x) => x.id !== id));
        });
    }
    if (albumRef.current) albumRef.current.value = "";
    if (cameraRef.current) cameraRef.current.value = "";
  }
  const removeFile = (i) => setFiles((p) => p.filter((_, idx) => idx !== i));

  async function submit() {
    if (!items.length && !files.length) return;
    setLoading(true);
    try {
      const res = await fetch("/api/prep", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items, files }) });
      const j = await res.json();
      if (j.success) setDone(true);
      else alert(j.message || "전송에 실패했어요.");
    } catch { alert("네트워크 오류가 발생했어요."); }
    setLoading(false);
  }

  if (done) {
    return (
      <div className="min-h-[100dvh] bg-background flex flex-col items-center justify-center px-8 text-center mx-auto w-full max-w-[430px]">
        <div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center mb-5"><Check className="w-8 h-8 text-navy" strokeWidth={3} /></div>
        <h1 className="text-[22px] font-bold text-foreground mb-2">코치에게 전달됐어요</h1>
        <p className="text-[15px] text-muted-foreground leading-relaxed mb-8">보내주신 정보로 맞춤 코칭을<br />준비할게요.</p>
        <button onClick={() => router.push("/portal")} className="w-full max-w-xs py-4 rounded-xl bg-primary text-white font-semibold text-base active:opacity-90">홈으로</button>
      </div>
    );
  }

  const canSubmit = (items.length || files.length) && !loading;

  return (
    <div className="min-h-[100dvh] bg-background mx-auto w-full max-w-[430px] pb-[calc(78px+env(safe-area-inset-bottom))]">
      <div className="px-4 pt-[calc(env(safe-area-inset-top)+14px)] pb-2 flex items-center gap-3">
        <button onClick={() => router.push("/portal")} className="w-9 h-9 -ml-1.5 rounded-lg flex items-center justify-center active:bg-muted"><ChevronLeft className="w-6 h-6" /></button>
        <h1 className="text-[20px] font-bold tracking-[-0.3px]">코칭 준비 자료</h1>
      </div>

      <div className="px-5 pt-2 pb-6">
        <p className="text-sm text-muted-foreground leading-relaxed">경기·원정·훈련 일정이나 코치가 알면 좋을 내용을 언제든 올려주세요.</p>

        {/* 일정·메모 추가 */}
        <div className="mt-6 bg-card border border-border rounded-2xl p-4">
          <div className="flex flex-wrap gap-2">
            {TYPES.map((t) => (
              <button key={t.key} type="button" onClick={() => setType(t.key)}
                className={cn("px-3.5 py-2 rounded-lg text-sm font-medium border transition-colors", type === t.key ? "bg-primary/10 border-primary text-primary" : "bg-card border-border text-foreground")}>{t.key}</button>
            ))}
          </div>
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} placeholder={cur.ph}
            className="w-full mt-3 rounded-xl border border-border bg-background p-3.5 text-[15px] leading-relaxed resize-none focus:outline-none focus:border-primary" />
          <button type="button" onClick={addItem} disabled={!text.trim()}
            className="w-full mt-3 py-3 rounded-xl bg-primary/10 text-primary text-[15px] font-semibold active:opacity-90 disabled:opacity-40">추가</button>
        </div>

        {/* 추가된 항목 */}
        {items.length ? (
          <div className="mt-4 bg-card border border-border rounded-2xl overflow-hidden">
            {items.map((it, i) => (
              <div key={i} className="flex items-start gap-3 p-4 first:border-t-0 border-t border-border">
                <span className="text-[11px] font-bold text-primary bg-primary/10 px-2 py-1 rounded-md shrink-0 mt-0.5">{it.type}</span>
                <div className="flex-1 text-[14px] text-foreground leading-relaxed">{it.text}</div>
                <button onClick={() => removeItem(i)} className="text-muted-foreground active:text-foreground shrink-0"><X className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
        ) : null}

        {/* 사진·파일 첨부 */}
        <div className="text-[15px] font-bold text-foreground mt-7 mb-3">사진·파일 첨부</div>
        <div className="grid grid-cols-2 gap-2.5">
          <button type="button" onClick={() => albumRef.current?.click()} className="flex items-center justify-center gap-2 py-3.5 rounded-xl border border-border bg-card text-[14px] font-semibold text-foreground active:bg-muted"><ImagePlus className="w-5 h-5 text-primary" />앨범</button>
          <button type="button" onClick={() => cameraRef.current?.click()} className="flex items-center justify-center gap-2 py-3.5 rounded-xl border border-border bg-card text-[14px] font-semibold text-foreground active:bg-muted"><Camera className="w-5 h-5 text-primary" />카메라</button>
        </div>
        <input ref={albumRef} type="file" accept="image/*,application/pdf" multiple hidden onChange={(e) => doUpload(Array.from(e.target.files || []))} />
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => doUpload(Array.from(e.target.files || []))} />

        {/* 업로드 진행 */}
        {pending.map((p) => (
          <div key={p.id} className="mt-2.5 bg-card border border-border rounded-xl p-3">
            <div className="flex justify-between text-[13px]"><span className="text-foreground truncate">{p.name}</span><span className="text-muted-foreground">{p.pct}%</span></div>
            <div className="h-1.5 rounded-full bg-border mt-2 overflow-hidden"><div className="h-full bg-primary transition-all" style={{ width: `${p.pct}%` }} /></div>
          </div>
        ))}

        {/* 첨부된 파일 */}
        {files.length ? (
          <div className="mt-3 bg-card border border-border rounded-2xl overflow-hidden">
            {files.map((f, i) => (
              <div key={i} className="flex items-center gap-3 p-3.5 first:border-t-0 border-t border-border">
                <Paperclip className="w-4 h-4 text-muted-foreground shrink-0" />
                <div className="flex-1 text-[14px] text-foreground truncate">{f.name}</div>
                <button onClick={() => removeFile(i)} className="text-muted-foreground active:text-foreground shrink-0"><X className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
        ) : null}

        {/* 제출 */}
        <button type="button" onClick={submit} disabled={!canSubmit}
          className="w-full mt-7 py-4 rounded-xl bg-primary text-white text-base font-semibold active:opacity-90 disabled:opacity-40">
          {loading ? "보내는 중…" : "코치에게 보내기"}
        </button>
      </div>

      <BottomNav />
    </div>
  );
}
