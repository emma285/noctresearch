"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { Moon, ChevronDown, Check, ArrowRight, ArrowLeft, Loader2 } from "lucide-react";
import { QUESTIONS, YEARS, HRS, MINS, hrLabel } from "../data/questions";

// ─── Brand ───
const Brand = () => (
  <div className="fixed top-0 left-0 right-0 z-50 flex items-center gap-2 px-6 py-4 bg-white/90 backdrop-blur-md border-b border-gray-100">
    <Moon className="w-5 h-5 text-blue-500" />
    <span className="text-sm font-semibold tracking-widest text-gray-600 uppercase">noct research</span>
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
  // 드롭다운 열릴 때 선택값 위치로 스크롤
  useEffect(() => {
    if (open && listRef.current && value) {
      const idx = options.indexOf(value);
      if (idx > -1) {
        const itemH = 44; // 대략적인 항목 높이
        listRef.current.scrollTop = Math.max(0, idx * itemH - 80);
      }
    }
  }, [open, value, options]);
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
export default function IntakeForm() {
  const [idx, setIdx] = useState(0);
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const containerRef = useRef(null);

  const Q = QUESTIONS;
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
    setIdx(i);
    if (containerRef.current) containerRef.current.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const next = () => { if (idx < Q.length - 1) goTo(idx + 1); };
  const prev = () => { if (idx > 0) goTo(idx - 1); };

  const submit = async () => {
    setLoading(true);
    try {
      // 시간 데이터 정리 (h/m → 통합)
      const payload = { ...data };
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
          <Moon className="w-12 h-12 text-blue-500 mb-6" />
          <h1 className="text-2xl font-bold text-gray-900 mb-3">수면 코칭 사전 질문지</h1>
          <p className="text-gray-500 text-sm leading-relaxed mb-2">약 10~15분 정도 소요됩니다.<br />편하게 작성해 주세요.<br />모르거나 해당 없는 항목은 비워 두셔도 괜찮아요.</p>
          <p className="text-xs text-amber-600 bg-amber-50 px-4 py-2 rounded-lg mt-4">⚠️ 임시 저장이 되지 않으니, 시간 여유가 있을 때 끝까지 작성해 주세요.</p>
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
              <TimePair key={f.k} label={f.label}
                hVal={get(f.k + "_h")} mVal={get(f.k + "_m")}
                onH={v => set(f.k + "_h", v)} onM={v => set(f.k + "_m", v)} />
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
              <div key={si}>
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
              <div key={i}>
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
              <div key={i}>
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
    <div className="min-h-screen bg-gray-50">
      <Brand />
      <Progress current={idx} total={Q.length} />
      <div ref={containerRef} className="max-w-lg mx-auto px-6 pt-24 pb-12">
        {renderQ()}
        {q.type !== "welcome" && q.type !== "complete" && (
          <NavBtns idx={idx} total={Q.length} onPrev={prev} onNext={next} loading={loading} />
        )}
        {q.type === "welcome" && (
          <div className="mt-12 flex justify-center">
            <button onClick={next} className="flex items-center gap-2 px-8 py-4 rounded-2xl bg-blue-600 text-white font-semibold text-lg hover:bg-blue-700 transition-all shadow-md">
              시작하기 <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
