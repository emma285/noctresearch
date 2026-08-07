"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { Moon, ChevronDown, Check, ArrowRight, ArrowLeft, Loader2 } from "lucide-react";
import { QUESTIONS as DEFAULT_QUESTIONS, YEARS, HRS, MINS, hrLabel } from "../data/questions";

// ─── Brand ───
const Brand = ({ athlete }) => (
  <div className="fixed top-0 left-0 right-0 z-50 flex items-center gap-2 px-6 py-3.5 bg-white/90 backdrop-blur-md border-b border-gray-100">
    {athlete ? (
      <img src="/noct-logo.png" alt="NOCT Research" className="h-5 w-auto" />
    ) : (
      <>
        <Moon className="w-5 h-5 text-blue-500" />
        <span className="text-sm font-semibold tracking-widest text-gray-600 uppercase">noct research</span>
      </>
    )}
  </div>
);

// ─── Progress ───
const Progress = ({ current, total }) => (
  <div className="fixed top-[57px] left-0 right-0 z-40 h-1 bg-gray-100">
    <div className="h-full bg-blue-500 transition-all duration-500 ease-out" style={{ width: `${(current / (total - 1)) * 100}%` }} />
  </div>
);

// ─── Section Badge ───
const SB = ({ n, name }) => (
  <div className="flex items-center gap-2 mb-5">
    <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-semibold tracking-wide">PART {n}</span>
    <span className="text-xs text-gray-400">{name}</span>
  </div>
);

// ─── Vertical Pill (single select) ───
// @media(hover:hover) → 마우스 환경에서만 hover, 모바일에서 더블탭 방지
const VPill = ({ label, sel, onClick, desc }) => (
  <button onClick={onClick} className={`w-full px-5 py-4 rounded-2xl text-left text-[15px] font-medium transition-all border active:scale-[0.98] ${sel ? "bg-blue-600 text-white border-blue-600 shadow-sm" : "bg-white text-gray-700 border-gray-200"}`}
    style={{ WebkitTapHighlightColor: "transparent" }}>
    <span>{label}</span>
    {desc && <span className={`block text-xs mt-0.5 ${sel ? "text-blue-100" : "text-gray-400"}`}>{desc}</span>}
  </button>
);

// ─── Checkbox Pill (multi select) ───
const ChkPill = ({ label, chk, onClick }) => (
  <button onClick={onClick} className={`w-full flex items-center gap-3 px-5 py-4 rounded-2xl text-[15px] border transition-all text-left active:scale-[0.98] ${chk ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-700 border-gray-200"}`}
    style={{ WebkitTapHighlightColor: "transparent" }}>
    <span className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 ${chk ? "border-white bg-white/20" : "border-gray-300"}`}>
      {chk && <Check className="w-3 h-3 text-white" />}
    </span>
    <span className="flex-1">{label}</span>
  </button>
);

// ─── Text Input ───
const TInput = ({ value, onChange, ph, autoFocus }) => (
  <input type="text" value={value || ""} onChange={e => onChange(e.target.value)} placeholder={ph || ""} autoFocus={autoFocus}
    className="w-full bg-white border-2 border-gray-200 focus:border-blue-400 text-gray-900 text-lg py-3 px-4 rounded-xl outline-none transition-colors placeholder:text-gray-300" />
);

// ─── Textarea ───
const TArea = ({ value, onChange, ph, rows = 3 }) => (
  <textarea value={value || ""} onChange={e => onChange(e.target.value)} placeholder={ph || ""} rows={rows}
    className="w-full bg-white border-2 border-gray-200 focus:border-blue-400 rounded-xl text-gray-900 text-base p-4 outline-none transition-colors placeholder:text-gray-300 resize-none" />
);

// ─── Dropdown Select ───
const Dropdown = ({ value, onChange, options, placeholder }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const listRef = useRef(null);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  // 드롭다운 열릴 때 선택값(또는 placeholder) 위치로 스크롤
  useEffect(() => {
    if (open && listRef.current) {
      const target = value || placeholder;
      if (target) {
        const idx = options.indexOf(target);
        if (idx > -1) {
          const itemH = 44;
          listRef.current.scrollTop = Math.max(0, idx * itemH - 80);
        }
      }
    }
  }, [open, value, options, placeholder]);
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)} className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl border-2 text-left text-[15px] transition-all ${value ? "border-blue-400 bg-blue-50 text-gray-900" : "border-gray-200 bg-white text-gray-400"}`}>
        <span>{value || placeholder || "선택해 주세요"}</span>
        <ChevronDown className={`w-5 h-5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div ref={listRef} className="absolute z-50 mt-2 w-full max-h-60 overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-lg">
          {options.map(o => (
            <button key={o} onClick={() => { onChange(o); setOpen(false); }} className={`w-full px-5 py-3 text-left text-sm hover:bg-blue-50 transition-colors ${value === o ? "bg-blue-50 text-blue-600 font-medium" : "text-gray-700"}`}>
              {o}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Time Dropdown Pair ───
const TimePair = ({ label, hVal, mVal, onH, onM }) => (
  <div className="space-y-2">
    <label className="text-sm font-medium text-gray-600">{label}</label>
    <div className="flex gap-3">
      <div className="flex-1">
        <select value={hVal ?? ""} onChange={e => onH(e.target.value === "" ? null : Number(e.target.value))}
          className={`w-full px-4 py-3 rounded-xl border-2 text-sm appearance-none bg-white transition-all outline-none ${hVal !== null && hVal !== undefined ? "border-blue-400 bg-blue-50" : "border-gray-200"}`}>
          <option value="">시</option>
          {HRS.map(h => <option key={h} value={h}>{hrLabel(h)}</option>)}
        </select>
      </div>
      <div className="w-24">
        <select value={mVal ?? ""} onChange={e => onM(e.target.value === "" ? null : e.target.value)}
          className={`w-full px-4 py-3 rounded-xl border-2 text-sm appearance-none bg-white transition-all outline-none ${mVal !== null && mVal !== undefined ? "border-blue-400 bg-blue-50" : "border-gray-200"}`}>
          <option value="">분</option>
          {MINS.map(m => <option key={m} value={m}>{m}분</option>)}
        </select>
      </div>
    </div>
  </div>
);

// ─── Navigation Buttons ───
const NavBtns = ({ idx, total, onPrev, onNext, loading }) => (
  <div className="mt-16 pt-6 border-t border-gray-100 flex justify-between items-center">
    {idx > 0 ? (
      <button onClick={onPrev} className="flex items-center gap-2 px-5 py-3 rounded-xl text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-all text-sm font-medium">
        <ArrowLeft className="w-4 h-4" /> 이전
      </button>
    ) : <div />}
    {idx < total - 1 && (
      <button onClick={onNext} disabled={loading}
        className="flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-all text-sm font-medium disabled:opacity-50 shadow-sm">
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>다음 <ArrowRight className="w-4 h-4" /></>}
      </button>
    )}
  </div>
);

// ═══════════ MAIN COMPONENT ═══════════
export default function IntakeForm({ questions = DEFAULT_QUESTIONS, storageKey, formType } = {}) {
  const Q = questions;

  // storageKey가 있으면 localStorage에 자동 저장/복원 (임시저장)
  const loadSaved = () => {
    if (!storageKey || typeof window === "undefined") return null;
    try { return JSON.parse(localStorage.getItem(storageKey) || "null"); } catch { return null; }
  };

  // SSR/CSR 초기 렌더 일치를 위해 항상 기본값으로 시작 → 마운트 후 localStorage 복원 (hydration 안전)
  const [idx, setIdx] = useState(0);
  const [data, setData] = useState(() => {
    const init = {};
    Q.forEach(q => { if (q.def && q.k) init[q.k] = q.def; });
    return init;
  });
  const [restored, setRestored] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [err, setErr] = useState("");
  const containerRef = useRef(null);

  // 마운트 후 임시저장 복원 (클라 전용 → 서버 렌더와 불일치 없음)
  useEffect(() => {
    const saved = loadSaved();
    if (saved) {
      if (typeof saved.idx === "number") setIdx(saved.idx);
      if (saved.data) setData(prev => ({ ...prev, ...saved.data }));
    }
    setRestored(true);
  }, []); // eslint-disable-line

  // 답변을 건드리면 에러 문구 자동 해제
  useEffect(() => { if (err) setErr(""); }, [data]); // eslint-disable-line

  // data/idx 변경 시 자동 저장 (복원 완료 후에만 → 기본값이 저장본 덮어쓰지 않게)
  useEffect(() => {
    if (!restored || !storageKey || typeof window === "undefined") return;
    try { localStorage.setItem(storageKey, JSON.stringify({ data, idx })); } catch {}
  }, [data, idx, storageKey, restored]);

  const q = Q[idx];

  const set = useCallback((k, v) => setData(p => ({ ...p, [k]: v })), []);
  const get = useCallback((k) => data[k], [data]);

  const toggleMulti = useCallback((k, v) => {
    setData(p => {
      const arr = p[k] || [];
      return { ...p, [k]: arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v] };
    });
  }, []);

  const goTo = useCallback((i) => {
    setErr("");
    setIdx(i);
    if (containerRef.current) containerRef.current.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  // showIf 조건부 문항 스킵 (골프/합숙 분기)
  const visible = useCallback((i) => { const qq = Q[i]; return !!qq && (!qq.showIf || qq.showIf(data)); }, [Q, data]);

  // 전 문항 필수 — 답변 여부 검증 (optional 제외)
  const isAnswered = (qq) => {
    if (!qq || qq.optional || qq.type === "welcome" || qq.type === "complete") return true;
    const d = data;
    switch (qq.type) {
      case "text": case "ta": case "dropdown": return !!(d[qq.k] && String(d[qq.k]).trim());
      case "body": return !!(d.height && d.weight);
      case "pills": case "pillsub": return !!d[qq.k];
      case "multi": return Array.isArray(d[qq.k]) && d[qq.k].length > 0;
      case "timegroup": return qq.fields.every(f => d[f.k + "_h"] !== null && d[f.k + "_h"] !== undefined);
      case "epworth": return qq.sits.every((_, i) => d[`ep_${i}`] !== undefined);
      case "beliefs": return qq.items.every(it => d[it.k] !== undefined);
      case "readiness": return qq.items.every((_, i) => d[`r_${i}`] !== undefined);
      default: return true;
    }
  };
  const validate = (qq) => {
    if (!isAnswered(qq)) return "이 질문에 답해 주세요.";
    if (qq && qq.k === "phone") {
      const v = String(data.phone || "").trim();
      if (v && !/^01[016789]-?\d{3,4}-?\d{4}$/.test(v)) return "연락처 형식을 확인해 주세요. (예: 010-1234-5678)";
    }
    return "";
  };

  const next = () => {
    // 운동선수 폼만 전 문항 필수 검증 (기존 코칭 폼은 원래대로 선택 허용)
    if (formType === "athlete") {
      const msg = validate(q);
      if (msg) { setErr(msg); return; }
    }
    let i = idx + 1; while (i < Q.length && !visible(i)) i++; if (i <= Q.length - 1) goTo(i);
  };
  const prev = () => { let i = idx - 1; while (i > 0 && !visible(i)) i--; if (i >= 0) goTo(i); };
  const goFirst = () => { let i = 1; while (i < Q.length && !visible(i)) i++; goTo(Math.min(i, Q.length - 1)); };

  // 에러 시 답 안 한 첫 항목 id 찾기 (여러 항목 문항용)
  const firstMissingId = (qq) => {
    if (!qq) return null;
    const d = data;
    switch (qq.type) {
      case "epworth": { const i = qq.sits.findIndex((_, si) => d[`ep_${si}`] === undefined); return i >= 0 ? `f-ep_${i}` : null; }
      case "beliefs": { const it = qq.items.find(it => d[it.k] === undefined); return it ? `f-${it.k}` : null; }
      case "readiness": { const i = qq.items.findIndex((_, ri) => d[`r_${ri}`] === undefined); return i >= 0 ? `f-r_${i}` : null; }
      case "timegroup": { const f = qq.fields.find(ff => d[ff.k + "_h"] === null || d[ff.k + "_h"] === undefined); return f ? `f-${f.k}` : null; }
      default: return null;
    }
  };
  const scrollToError = () => {
    const id = firstMissingId(q);
    const el = id && typeof document !== "undefined" ? document.getElementById(id) : null;
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    else if (containerRef.current) containerRef.current.scrollTo({ top: 0, behavior: "smooth" });
  };

  const submit = async () => {
    setLoading(true);
    try {
      // 시간 데이터 정리 (h/m → 통합)
      const payload = { ...data };
      if (formType) payload.formType = formType;
      // 운동선수 폼: 출생연도 → 생년월일 속성으로 매핑
      if (data.birth_year && !payload.birthdate) payload.birthdate = data.birth_year;
      ["wd_bed", "wd_sleep", "wd_wake", "we_bed", "we_sleep", "we_wake", "ideal_bed", "ideal_wake"].forEach(k => {
        const h = data[k + "_h"];
        const m = data[k + "_m"] || "00";
        if (h !== null && h !== undefined) {
          payload[k] = `${h}:${m}`;
          payload[k + "_h"] = h;
          payload[k + "_m"] = m;
        }
      });

      // belief 키 매핑 (b1→belief_catastrophe 등)
      if (data.b1 !== undefined) payload.belief_catastrophe = data.b1;
      if (data.b2 !== undefined) payload.belief_worry = data.b2;
      if (data.b3 !== undefined) payload.belief_monitor = data.b3;

      // readiness 매핑
      Q.filter(q => q.type === "readiness").forEach(q => {
        q.items.forEach((_, i) => {
          if (data[`r_${i}`] !== undefined) payload[`readiness_${i}`] = data[`r_${i}`];
        });
      });

      // epworth 매핑
      for (let i = 0; i < 8; i++) {
        if (data[`ep_${i}`] !== undefined) payload[`epworth_${i}`] = data[`ep_${i}`];
      }

      // medications 키 통합
      if (data.med) payload.medications = data.med;

      // prev_attempts → previous_attempts
      if (data.prev_attempts) payload.previous_attempts = data.prev_attempts;

      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (result.success) {
        setSubmitted(true);
        if (storageKey && typeof window !== "undefined") { try { localStorage.removeItem(storageKey); } catch {} }
        goTo(Q.length - 1);
      } else {
        alert("전송 중 오류가 발생했습니다. 다시 시도해 주세요.");
      }
    } catch (e) {
      console.error(e);
      alert("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // ─── Render Question ───
  const renderQ = () => {
    if (!q) return null;

    // Welcome
    if (q.type === "welcome") {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
          {formType === "athlete"
            ? <span className="text-[11px] font-extrabold tracking-[0.22em] text-blue-600 mb-3">운동선수 전용</span>
            : <Moon className="w-12 h-12 text-blue-500 mb-6" />}
          <h1 className="text-2xl font-bold text-gray-900 mb-3">수면 코칭 사전 질문지</h1>
          <p className="text-gray-500 text-sm leading-relaxed">
            {formType === "athlete"
              ? <>약 10~15분 정도 소요됩니다.<br />모든 항목에 답해 주세요.<br />해당 없으면 '없음'이라고 적어 주세요.</>
              : <>약 10~15분 정도 소요됩니다.<br />편하게 작성해 주세요.<br />모르거나 해당 없는 항목은 비워 두셔도 괜찮아요.</>}
          </p>
          {!storageKey && <p className="text-xs text-amber-600 bg-amber-50 px-4 py-2 rounded-lg mt-4">⚠️ 임시 저장이 되지 않으니, 시간 여유가 있을 때 끝까지 작성해 주세요.</p>}
        </div>
      );
    }

    // Complete
    if (q.type === "complete") {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-6">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">
            {submitted ? "작성해 주셔서 감사합니다!" : "마지막으로 확인해 주세요"}
          </h1>
          <p className="text-gray-500 text-sm mb-6">
            {submitted ? "작성하신 내용을 바탕으로\n맞춤 코칭 방향을 준비할게요 😊".split("\n").map((l, i) => <span key={i}>{l}<br /></span>) : "제출 버튼을 눌러주세요."}
          </p>
          {!submitted && (
            <div className="flex flex-col items-center gap-4">
              <button onClick={submit} disabled={loading}
                className="px-8 py-4 rounded-2xl bg-blue-600 text-white font-semibold text-lg hover:bg-blue-700 transition-all shadow-md disabled:opacity-50">
                {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "제출하기"}
              </button>
              <button onClick={prev} className="flex items-center gap-2 px-5 py-3 rounded-xl text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-all text-sm font-medium">
                <ArrowLeft className="w-4 h-4" /> 이전으로 돌아가기
              </button>
            </div>
          )}
        </div>
      );
    }

    // Section badge
    const badge = q.sec ? <SB n={q.sn} name={q.sec} /> : null;
    const title = <h2 className="text-xl font-bold text-gray-900 mb-1 whitespace-pre-line">{q.title}</h2>;
    const sub = q.sub ? <p className="text-sm text-gray-400 mb-5 whitespace-pre-line">{q.sub}</p> : <div className="mb-5" />;

    // ─── Type renderers ───

    // Text
    if (q.type === "text") {
      return <>{badge}{title}{sub}<TInput value={get(q.k)} onChange={v => set(q.k, v)} ph={q.ph} autoFocus /></>;
    }

    // Textarea
    if (q.type === "ta") {
      return <>{badge}{title}{sub}<TArea value={get(q.k)} onChange={v => set(q.k, v)} ph={q.ph} rows={4} /></>;
    }

    // Dropdown (birth year)
    if (q.type === "dropdown") {
      return <>{badge}{title}{sub}<Dropdown value={get(q.k)} onChange={v => set(q.k, v)} options={YEARS} placeholder={q.def || "선택해 주세요"} /></>;
    }

    // Body (height/weight)
    if (q.type === "body") {
      return (
        <>{badge}{title}{sub}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-500 mb-1 block">키 (cm)</label>
              <input type="number" value={data.height || ""} onChange={e => set("height", e.target.value)} placeholder="170"
                className="w-full bg-white border-2 border-gray-200 focus:border-blue-400 text-gray-900 py-3 px-4 rounded-xl outline-none transition-colors text-lg" />
            </div>
            <div>
              <label className="text-sm text-gray-500 mb-1 block">체중 (kg)</label>
              <input type="number" value={data.weight || ""} onChange={e => set("weight", e.target.value)} placeholder="65"
                className="w-full bg-white border-2 border-gray-200 focus:border-blue-400 text-gray-900 py-3 px-4 rounded-xl outline-none transition-colors text-lg" />
            </div>
          </div>
        </>
      );
    }

    // Pills (single select)
    if (q.type === "pills") {
      return (
        <>{badge}{title}{sub}
          <div className="space-y-3">
            {q.opts.map((o, i) => (
              <VPill key={o} label={o} desc={q.desc?.[i]} sel={get(q.k) === o} onClick={() => set(q.k, o)} />
            ))}
          </div>
        </>
      );
    }

    // Pills with sub-input
    if (q.type === "pillsub") {
      const val = get(q.k);
      const showSub = q.subOn?.includes(val);
      return (
        <>{badge}{title}{sub}
          <div className="space-y-3">
            {q.opts.map(o => (
              <VPill key={o} label={o} sel={val === o} onClick={() => set(q.k, o)} />
            ))}
          </div>
          {showSub && (
            <div className="mt-4">
              <label className="text-sm text-gray-500 mb-1 block">{q.subL}</label>
              {(q.subRows && q.subRows > 1) ? (
                <TArea value={get(q.k + "_detail")} onChange={v => set(q.k + "_detail", v)} ph={q.subPh} rows={q.subRows} />
              ) : (
                <TInput value={get(q.k + "_detail")} onChange={v => set(q.k + "_detail", v)} ph={q.subPh} />
              )}
            </div>
          )}
        </>
      );
    }

    // Multi select
    if (q.type === "multi") {
      const arr = get(q.k) || [];
      return (
        <>{badge}{title}{sub}
          <div className="space-y-3">
            {q.opts.map(o => (
              <ChkPill key={o} label={o} chk={arr.includes(o)} onClick={() => toggleMulti(q.k, o)} />
            ))}
            {q.hasOther && (
              <>
                <ChkPill label="기타" chk={arr.includes("기타")} onClick={() => toggleMulti(q.k, "기타")} />
                {arr.includes("기타") && (
                  <div className="mt-2 pl-2">
                    <TInput value={get(q.k + "_other")} onChange={v => set(q.k + "_other", v)} ph={q.otherPh || "직접 입력해 주세요"} />
                  </div>
                )}
              </>
            )}
          </div>
        </>
      );
    }

    // Time group (weekday/weekend/ideal on one screen)
    if (q.type === "timegroup") {
      return (
        <>{badge}{title}{sub}
          <div className="space-y-6">
            {q.fields.map(f => (
              <div key={f.k} id={`f-${f.k}`}>
                <TimePair label={f.label}
                  hVal={get(f.k + "_h")} mVal={get(f.k + "_m")}
                  onH={v => set(f.k + "_h", v)} onM={v => set(f.k + "_m", v)} />
              </div>
            ))}
          </div>
        </>
      );
    }

    // Epworth
    if (q.type === "epworth") {
      return (
        <>{badge}{title}{sub}
          <div className="space-y-6">
            {q.sits.map((sit, si) => (
              <div key={si} id={`f-ep_${si}`}>
                <p className="text-sm font-medium text-gray-700 mb-2">{si + 1}. {sit}</p>
                <div className="grid grid-cols-4 gap-2">
                  {q.sLbl.map((lbl, li) => (
                    <button key={li} onClick={() => set(`ep_${si}`, li)}
                      className={`py-3 px-2 rounded-xl text-xs font-medium text-center border transition-all whitespace-pre-line leading-tight ${get(`ep_${si}`) === li ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-200 hover:border-blue-300"}`}>
                      {lbl}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      );
    }

    // Beliefs (1-5 scale)
    if (q.type === "beliefs") {
      return (
        <>{badge}{title}{sub}
          <div className="space-y-6">
            {q.items.map((item, i) => (
              <div key={i} id={`f-${item.k}`}>
                <p className="text-sm font-medium text-gray-700 mb-2">{item.t}</p>
                <div className="grid grid-cols-5 gap-2">
                  {q.scale.map((lbl, li) => (
                    <button key={li} onClick={() => set(item.k, li + 1)}
                      className={`py-3 px-1 rounded-xl text-xs font-medium text-center border transition-all whitespace-pre-line leading-tight ${get(item.k) === li + 1 ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-200 hover:border-blue-300"}`}>
                      {lbl}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      );
    }

    // Readiness (1-5 scale)
    if (q.type === "readiness") {
      return (
        <>{badge}{title}{sub}
          <div className="space-y-6">
            {q.items.map((item, i) => (
              <div key={i} id={`f-r_${i}`}>
                <p className="text-sm font-medium text-gray-700 mb-2">{item}</p>
                <div className="grid grid-cols-5 gap-2">
                  {[1, 2, 3, 4, 5].map(n => (
                    <button key={n} onClick={() => set(`r_${i}`, n)}
                      className={`py-3 rounded-xl text-sm font-bold border transition-all ${get(`r_${i}`) === n ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-500 border-gray-200 hover:border-blue-300"}`}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      );
    }

    return null;
  };

  return (
    <div className={`min-h-screen ${formType === "athlete" ? "noct-athlete bg-[#F2F3F6]" : "bg-gray-50"}`}>
      <Brand athlete={formType === "athlete"} />
      <Progress current={idx} total={Q.length} />
      <div ref={containerRef} className="max-w-lg mx-auto px-6 pt-24 pb-12">
        {renderQ()}
        {err && q.type !== "welcome" && q.type !== "complete" && (
          <button type="button" onClick={scrollToError}
            className="mt-5 inline-flex items-center gap-1.5 text-sm text-red-500 font-medium hover:text-red-600 transition-colors">
            <span>{err}</span>
            <span className="text-red-400 underline underline-offset-2">위치로 이동 ↓</span>
          </button>
        )}
        {q.type !== "welcome" && q.type !== "complete" && (
          <NavBtns idx={idx} total={Q.length} onPrev={prev} onNext={next} loading={loading} />
        )}
        {q.type !== "welcome" && q.type !== "complete" && idx > 1 && (
          <div className="mt-4 text-center">
            <button type="button" onClick={goFirst}
              className="text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors">
              처음으로 가기
            </button>
          </div>
        )}
        {q.type === "welcome" && (
          <div className="mt-6 flex flex-col items-center gap-4">
            <button onClick={next} className="flex items-center gap-2 px-8 py-4 rounded-2xl bg-blue-600 text-white font-semibold text-lg hover:bg-blue-700 transition-all shadow-md">
              시작하기 <ArrowRight className="w-5 h-5" />
            </button>
            {storageKey && <p className="text-xs text-gray-400 text-center">작성 내용은 자동 저장돼요. 중간에 닫아도 이어서 작성할 수 있어요.</p>}
          </div>
        )}
      </div>
    </div>
  );
}
