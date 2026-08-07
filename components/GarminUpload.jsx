"use client";
import { useState, useRef } from "react";
import { ImagePlus, X, Check, Loader2, ShieldCheck, CalendarDays, Plus } from "lucide-react";
import { upload } from "@vercel/blob/client";

// ─── 캡처 종류 (하루당 4장, 참고용 안내) ───
const TYPES = [
  { key: "sleep_timeline", label: "수면 타임라인", sample: "/guide/sleep-timeline.jpg" },
  { key: "sleep_stages", label: "수면 단계·측정지표", sample: "/guide/sleep-stages.jpg" },
  { key: "battery", label: "바디배터리", sample: "/guide/battery.png" },
  { key: "hr", label: "심박수", sample: "/guide/hr.jpg" },
];

// ─── 상단 섹션 ───
const Hero = () => (
  <header className="bg-gradient-to-br from-navy via-navy to-primary text-white">
    <div className="max-w-lg mx-auto px-6 pt-14 pb-10">
      <img
        src="/noct-logo.png"
        alt="NOCT Research"
        className="h-4 w-auto opacity-90 mb-7"
        style={{ filter: "brightness(0) invert(1)" }}
      />
      <h1 className="text-[24px] font-bold leading-snug mb-2">가민 수면 데이터 업로드</h1>
      <p className="text-white/70 text-[13px] leading-relaxed">
        가민 커넥트 앱에서 최근 7일치를
        <br />
        하루씩 묶어서 올려주세요.
      </p>
    </div>
  </header>
);

// ─── 유틸 ───
const formatPhone = (raw) => {
  const d = String(raw).replace(/\D/g, "").slice(0, 11);
  if (d.length < 4) return d;
  if (d.length < 8) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
};
const isValidPhone = (v) => /^01[016789]-\d{3,4}-\d{4}$/.test(v);

// ISO 날짜(YYYY-MM-DD)에 n일 더하기 (UTC 일관 계산 — 타임존으로 하루 밀리는 것 방지)
const addDays = (iso, n) => {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
};

let _dayId = 0;
const newDay = (date = "") => ({ id: ++_dayId, date, files: [] });

const Footer = () => (
  <footer className="mt-12 flex flex-col items-center gap-2">
    <img src="/noct-logo.png" alt="NOCT Research" className="h-3.5 w-auto opacity-30" />
    <p className="text-[11px] text-muted-foreground">입력하신 정보는 안전하게 보관되며 코칭에만 사용돼요.</p>
  </footer>
);

export default function GarminUpload() {
  const [phone, setPhone] = useState("");
  const [days, setDays] = useState(() => [newDay()]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [submitted, setSubmitted] = useState(false);
  const [err, setErr] = useState("");
  const inputRefs = useRef({}); // dayId → input el

  const totalCount = days.reduce((a, d) => a + d.files.length, 0);

  // 다음 날 추가 → 1일차 날짜 + (기존 일수)일로 자동 계산
  const addDay = () =>
    setDays((prev) => {
      const first = prev[0];
      const nextDate = first?.date ? addDays(first.date, prev.length) : "";
      return [...prev, newDay(nextDate)];
    });

  const removeDay = (id) =>
    setDays((prev) => {
      const d = prev.find((x) => x.id === id);
      if (d) d.files.forEach((f) => URL.revokeObjectURL(f.preview));
      return prev.filter((x) => x.id !== id);
    });

  // 1일차 날짜 바꾸면 이후 날짜들 자동 재계산
  const setDate = (id, date) =>
    setDays((prev) => {
      const idx = prev.findIndex((d) => d.id === id);
      if (idx === 0 && date) return prev.map((d, i) => ({ ...d, date: addDays(date, i) }));
      return prev.map((d) => (d.id === id ? { ...d, date } : d));
    });

  const addFiles = (dayId, fileList) => {
    const arr = Array.from(fileList || []).filter((f) => f.type.startsWith("image/"));
    setDays((prev) =>
      prev.map((d) =>
        d.id !== dayId
          ? d
          : {
              ...d,
              files: [
                ...d.files,
                ...arr.map((f) => ({
                  file: f,
                  preview: URL.createObjectURL(f),
                  id: `${f.name}-${f.size}-${f.lastModified}-${Math.round(performance.now())}-${Math.random()}`,
                })),
              ],
            }
      )
    );
    setErr("");
  };

  const removeFile = (dayId, fileId) =>
    setDays((prev) =>
      prev.map((d) => {
        if (d.id !== dayId) return d;
        const t = d.files.find((f) => f.id === fileId);
        if (t) URL.revokeObjectURL(t.preview);
        return { ...d, files: d.files.filter((f) => f.id !== fileId) };
      })
    );

  const submit = async () => {
    if (!isValidPhone(phone)) {
      setErr("연락처를 정확히 입력해 주세요. (예: 010-1234-5678)");
      return;
    }
    if (totalCount === 0) {
      setErr("캡처 이미지를 1장 이상 올려주세요.");
      return;
    }
    setUploading(true);
    setErr("");
    setProgress({ done: 0, total: totalCount });

    const folder = phone.replace(/\D/g, "");
    try {
      let done = 0;
      const breakdown = {};
      for (let di = 0; di < days.length; di++) {
        const d = days[di];
        const dayLabel = d.date ? d.date : `day${di + 1}`;
        let i = 0;
        for (const f of d.files) {
          const ext = (f.file.name.split(".").pop() || "png").toLowerCase();
          const pathname = `garmin/${folder}/${dayLabel}/${Date.now()}_${i}.${ext}`;
          await upload(pathname, f.file, {
            access: "private",
            handleUploadUrl: "/api/upload",
            clientPayload: JSON.stringify({ phone, day: dayLabel }),
          });
          i += 1;
          done += 1;
          setProgress({ done, total: totalCount });
        }
        if (d.files.length) breakdown[d.date || `${di + 1}일차`] = d.files.length;
      }
      try {
        await fetch("/api/notify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone, count: totalCount, folder, breakdown }),
        });
      } catch (_) {}
      setSubmitted(true);
    } catch (e) {
      console.error(e);
      setErr("업로드 오류: " + (e?.message || "알 수 없는 오류") + " — 다시 시도해 주세요.");
    } finally {
      setUploading(false);
    }
  };

  // ─── 완료 화면 ───
  if (submitted) {
    return (
      <div className="min-h-screen bg-background font-sans tracking-[-0.02em]">
        <div className="max-w-lg mx-auto px-6 pt-16 pb-12">
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
            <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mb-6">
              <Check className="w-8 h-8 text-success" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-3">데이터 잘 받았어요!</h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              코칭 때 분석해서 보여드릴게요 😊
              <br />
              창을 닫으셔도 됩니다.
            </p>
          </div>
          <Footer />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background font-sans tracking-[-0.02em]">
      <Hero />

      <div className="max-w-lg mx-auto px-5 pt-7 pb-12">
        {/* 연락처 */}
        <div className="mb-6">
          <label className="text-sm font-semibold text-foreground mb-2 block">연락처</label>
          <input
            type="tel"
            inputMode="numeric"
            value={phone}
            onChange={(e) => {
              setPhone(formatPhone(e.target.value));
              setErr("");
            }}
            placeholder="010-1234-5678"
            maxLength={13}
            className="w-full bg-white border border-border focus:border-primary focus:ring-4 focus:ring-primary/10 text-foreground text-base py-3.5 px-4 rounded-2xl outline-none transition-all placeholder:text-gray-300"
          />
          <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            데이터 매칭에만 사용돼요.
          </p>
        </div>

        {/* 캡처 안내 (경로 + 4종 샘플, 참고용) */}
        <div className="rounded-2xl bg-secondary/60 border border-border p-4 mb-6">
          <p className="text-[13px] font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
            <CalendarDays className="w-4 h-4 text-primary" />
            하루에 이 4가지를 캡처해요
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed mb-3">
            앱 하단 <b className="text-foreground">캘린더</b> → 날짜 선택 후, 아래 4가지를 캡처해서 그 날짜에 함께 올려주세요. (샘플을 탭하면 크게 보여요)
          </p>
          <img src="/guide/nav.jpg" alt="하단 메뉴에서 캘린더 선택" className="w-full rounded-lg border border-border mb-3" />
          <div className="grid grid-cols-4 gap-2">
            {TYPES.map((t) => (
              <a key={t.key} href={t.sample} target="_blank" rel="noreferrer" className="block">
                <div className="aspect-[9/16] rounded-lg border border-border bg-muted overflow-hidden">
                  <img src={t.sample} alt={t.label} className="w-full h-full object-cover object-top" />
                </div>
                <p className="text-[10px] text-foreground text-center mt-1 leading-tight font-medium">{t.label}</p>
              </a>
            ))}
          </div>
        </div>

        {/* 날짜별 카드 */}
        <div className="space-y-4">
          {days.map((d, di) => (
            <div key={d.id} className="bg-card border border-border rounded-2xl p-5">
              {/* 헤더: N일차 + 날짜 + 삭제 */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-xl bg-primary/10 text-primary text-[13px] font-bold flex items-center justify-center">
                    {di + 1}
                  </span>
                  <p className="text-[15px] font-bold text-foreground">{di + 1}일차</p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={d.date}
                    onChange={(e) => setDate(d.id, e.target.value)}
                    className="text-xs text-foreground bg-white border border-border rounded-lg px-2.5 py-1.5 outline-none focus:border-primary"
                  />
                  {days.length > 1 && (
                    <button onClick={() => removeDay(d.id)} className="text-muted-foreground hover:text-destructive p-1" aria-label="이 날 삭제">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* 4장 한 번에 첨부 */}
              <input
                ref={(el) => (inputRefs.current[d.id] = el)}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  addFiles(d.id, e.target.files);
                  e.target.value = "";
                }}
              />
              <button
                onClick={() => inputRefs.current[d.id]?.click()}
                className="w-full flex flex-col items-center justify-center gap-1.5 py-6 rounded-xl border-2 border-dashed border-border bg-secondary/40 text-muted-foreground hover:border-primary hover:text-primary hover:bg-primary/5 transition-all active:scale-[0.99]"
                style={{ WebkitTapHighlightColor: "transparent" }}
              >
                <ImagePlus className="w-6 h-6" />
                <span className="text-sm font-semibold">4장 첨부하기</span>
                <span className="text-[11px] text-muted-foreground">수면 타임라인 · 단계 · 바디배터리 · 심박수</span>
              </button>

              {d.files.length > 0 && (
                <div className="mt-3">
                  <p className="text-[11px] font-medium text-primary mb-1.5">{d.files.length}장</p>
                  <div className="grid grid-cols-4 gap-1.5">
                    {d.files.map((f) => (
                      <div key={f.id} className="relative aspect-square rounded-lg overflow-hidden border border-border bg-muted">
                        <img src={f.preview} alt="" className="w-full h-full object-cover" />
                        <button
                          onClick={() => removeFile(d.id, f.id)}
                          className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-navy/70 text-white flex items-center justify-center"
                          aria-label="삭제"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* 다음 날 추가 */}
        <button
          onClick={addDay}
          className="mt-4 w-full flex items-center justify-center gap-1.5 py-3.5 rounded-2xl border-2 border-dashed border-primary/40 text-primary bg-primary/5 hover:bg-primary/10 transition-all font-semibold text-sm active:scale-[0.99]"
        >
          <Plus className="w-4 h-4" /> 다음 날 추가
        </button>

        {err && <p className="mt-5 text-sm text-destructive font-medium text-center">{err}</p>}

        {/* 제출 */}
        <button
          onClick={submit}
          disabled={uploading}
          className="mt-4 w-full py-4 rounded-2xl bg-primary text-primary-foreground font-semibold text-lg hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
        >
          {uploading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              {progress.total > 0 ? `${progress.done}/${progress.total}장 올리는 중…` : "올리는 중…"}
            </span>
          ) : (
            `제출하기${totalCount > 0 ? ` · ${totalCount}장` : ""}`
          )}
        </button>

        <Footer />
      </div>
    </div>
  );
}
