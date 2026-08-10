"use client";
// 수면 기록 위저드 (기록 탭 /log/sleep). 한 질문씩. 하단 4탭 유지.
// data={bed,sol,wake,outbed,woke,waso,feel[],memo} · kind="sleep". 수면효율/총수면은 코치 전용(선수 숨김).
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { cn } from "../../lib/utils";
import BottomNav from "./BottomNav";

const SOL = ["바로 잠들어요", "15분 이내", "30분쯤", "1시간쯤", "1시간 이상"];
const OUTBED = ["바로 나왔어요", "10분 이내", "30분쯤", "1시간쯤", "1시간 이상"];
const WOKE = [{ t: "안 깼어요", n: 0 }, { t: "1번", n: 1 }, { t: "2번", n: 2 }, { t: "3번 이상", n: 3 }];
const WASO = ["10분 이내", "30분쯤", "1시간쯤", "1시간 이상"];
const FEEL = ["개운해요", "아직 피곤해요", "몸이 무거워요", "머리가 아파요", "꿈을 많이 꿨어요", "너무 졸려요"];

const fmt = (m) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
const hint = (m) => {
  const h = Math.floor(m / 60), mm = m % 60;
  const period = h < 5 ? "새벽" : h < 11 ? "아침" : h < 18 ? "오후" : "밤";
  let hh = h % 12; if (hh === 0) hh = 12;
  return `${period} ${hh}시 ${String(mm).padStart(2, "0")}분`;
};
const kstToday = () => new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);

function Chip({ on, children, onClick }) {
  return (
    <button type="button" onClick={onClick}
      className={cn("px-4 py-3 rounded-xl text-[15px] font-medium border text-left transition-colors",
        on ? "bg-primary/10 border-primary text-primary" : "bg-card border-border text-foreground")}>
      {children}
    </button>
  );
}

function TimePicker({ value, onChange }) {
  const step = (d) => onChange((value + d + 1440) % 1440);
  return (
    <div className="flex flex-col items-center">
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => step(-60)} className="w-11 h-11 rounded-xl border border-border text-lg text-muted-foreground active:bg-muted">−1h</button>
        <button type="button" onClick={() => step(-15)} className="w-11 h-11 rounded-xl border border-border text-2xl text-muted-foreground active:bg-muted">−</button>
        <div className="text-[40px] font-bold tracking-[-1px] tabular-nums w-[130px] text-center">{fmt(value)}</div>
        <button type="button" onClick={() => step(15)} className="w-11 h-11 rounded-xl border border-border text-2xl text-muted-foreground active:bg-muted">+</button>
        <button type="button" onClick={() => step(60)} className="w-11 h-11 rounded-xl border border-border text-lg text-muted-foreground active:bg-muted">+1h</button>
      </div>
      <div className="text-sm text-muted-foreground mt-4">{hint(value)}</div>
    </div>
  );
}

// 질문 래퍼 — 모듈 레벨(컴포넌트 밖). 안에 두면 매 렌더마다 remount돼서 textarea 포커스가 풀림.
function Q({ title, sub, children }) {
  return (
    <div>
      <h2 className="text-[22px] font-bold text-foreground tracking-[-0.4px] leading-snug whitespace-pre-line">{title}</h2>
      {sub ? <p className="text-sm text-muted-foreground mt-2">{sub}</p> : null}
      <div className="mt-8">{children}</div>
    </div>
  );
}

export default function SleepWizard({ email }) {
  const router = useRouter();
  const [am, setAm] = useState({ bed: 23 * 60 + 45, sol: null, wake: 7 * 60, outbed: null, woke: null, waso: null, feel: [], memo: "" });
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setAm((s) => ({ ...s, [k]: v }));

  const flow = ["bed", "sol", "wake", "outbed", "woke", ...(am.woke > 0 ? ["waso"] : []), "feel", "memo"];
  const id = flow[step];
  const last = step === flow.length - 1;

  const toggleFeel = (f) => set("feel", am.feel.includes(f) ? am.feel.filter((x) => x !== f) : [...am.feel, f]);

  async function submit() {
    setSaving(true);
    const summary = `취침 ${fmt(am.bed)} · 입면 ${am.sol || "-"} · 기상 ${fmt(am.wake)} · 침대밖까지 ${am.outbed || "-"} · 밤중깸 ${am.woke ?? 0}회 · WASO ${am.waso || "-"} · 느낌 ${am.feel.join(",")}`;
    try {
      await fetch("/api/log", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: email, kind: "sleep", date: kstToday(), data: { bed: am.bed, sol: am.sol, wake: am.wake, outbed: am.outbed, woke: am.woke ?? 0, waso: am.waso, feel: am.feel, memo: am.memo }, summary }),
      });
    } catch (e) { /* 저장 실패해도 이동 */ }
    router.push("/log");
    router.refresh();
  }
  const next = () => (last ? submit() : setStep((s) => s + 1));
  const back = () => (step === 0 ? router.push("/log") : setStep((s) => s - 1));

  return (
    <div className="h-[100dvh] flex flex-col bg-background mx-auto w-full max-w-[430px] pb-[calc(72px+env(safe-area-inset-bottom))]">
      {/* 헤더: 뒤로 + 진행 */}
      <div className="px-4 pt-[calc(env(safe-area-inset-top)+14px)] pb-3">
        <div className="flex items-center gap-3">
          <button type="button" onClick={back} className="w-9 h-9 -ml-1.5 rounded-lg flex items-center justify-center text-foreground active:bg-muted">
            <ChevronLeft className="w-6 h-6" strokeWidth={2} />
          </button>
          <div className="flex-1 h-1.5 rounded-full bg-border overflow-hidden">
            <div className="h-full bg-primary transition-all" style={{ width: `${((step + 1) / flow.length) * 100}%` }} />
          </div>
          <div className="text-[13px] font-semibold text-muted-foreground tabular-nums">{step + 1}/{flow.length}</div>
        </div>
      </div>

      {/* 질문 */}
      <div className="flex-1 overflow-y-auto px-5 pt-6">
        {id === "bed" && <Q title={"몇 시에\n잠들었나요?"} sub="침대에 누운 시각을 기재해주세요."><TimePicker value={am.bed} onChange={(v) => set("bed", v)} /></Q>}
        {id === "sol" && <Q title={"잠드는데 얼마나\n걸렸나요?"} sub="체감 시간을 기록해주세요.">
          <div className="flex flex-col gap-2.5">{SOL.map((o) => <Chip key={o} on={am.sol === o} onClick={() => set("sol", o)}>{o}</Chip>)}</div></Q>}
        {id === "wake" && <Q title="몇 시에 일어났나요?" sub="아침에 눈 뜬 시각을 기준으로 작성해주세요."><TimePicker value={am.wake} onChange={(v) => set("wake", v)} /></Q>}
        {id === "outbed" && <Q title={"침대 밖으로 나오는데\n얼마나 걸렸나요?"} sub="아침에 눈 뜨고 침대에 누워있던 시간을 체크해주세요.">
          <div className="flex flex-col gap-2.5">{OUTBED.map((o) => <Chip key={o} on={am.outbed === o} onClick={() => set("outbed", o)}>{o}</Chip>)}</div></Q>}
        {id === "woke" && <Q title={"자다가 중간에\n깬 적 있나요?"}>
          <div className="flex flex-col gap-2.5">{WOKE.map((o) => <Chip key={o.n} on={am.woke === o.n} onClick={() => set("woke", o.n)}>{o.t}</Chip>)}</div></Q>}
        {id === "waso" && <Q title="얼마나 깨어있었나요?" sub="밤에 깨어있던 시간을 다 합쳐서, 체감으로도 충분해요.">
          <div className="flex flex-col gap-2.5">{WASO.map((o) => <Chip key={o} on={am.waso === o} onClick={() => set("waso", o)}>{o}</Chip>)}</div></Q>}
        {id === "feel" && <Q title={"아침에 일어났을 때\n컨디션은 어땠어요?"} sub="해당되는 내용을 모두 골라주세요.">
          <div className="flex flex-col gap-2.5">{FEEL.map((o) => <Chip key={o} on={am.feel.includes(o)} onClick={() => toggleFeel(o)}>{o}</Chip>)}</div></Q>}
        {id === "memo" && <Q title="남기고 싶은 말이 있나요?" sub="필수는 아니에요. 코칭에 도움될만한 내용을 편하게 남겨주세요.">
          <textarea value={am.memo} onChange={(e) => set("memo", e.target.value)} rows={5} placeholder="예: 대회 전날이라 긴장됐어요…"
            className="w-full rounded-xl border border-border bg-card p-4 text-[15px] text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:border-primary resize-none" /></Q>}
      </div>

      {/* 하단 CTA + 탭 네비 (홈과 동일하게 유지) */}
      <div className="px-5 pt-3 pb-3">
        <button type="button" onClick={next} disabled={saving}
          className="w-full bg-primary text-white text-base font-semibold py-4 rounded-xl active:opacity-90 disabled:opacity-60">
          {saving ? "저장 중…" : last ? "기록 완료" : "다음"}
        </button>
      </div>
      <BottomNav />
    </div>
  );
}
