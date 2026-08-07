"use client";

import { Card, CardContent } from "../../../components/ui/card";
import { Progress } from "../../../components/ui/progress";

/* ---------- 데이터 ---------- */
const HERO_KPI = [
  { v: "56", u: "%", k: "수면 효율" },
  { v: "175", u: "분", k: "사회적 시차" },
  { v: "14", u: "/24", k: "주간 졸림" },
  { v: "4.8", u: "/5", k: "변화 준비도" },
];

const FLAGS = ["수면효율 56%", "사회적 시차 175분", "주간 졸림 Epworth 14", "파국적 사고·수면불안 높음"];

// 20:00 = 0h 기준. 커스텀 타임라인용
const SPAN = 16; // 20:00 → 12:00
const pct = (h) => (h / SPAN) * 100;
const ROWS = [
  { label: "이상 리듬", sub: "몸이 원하는", start: 5.0, end: 13.0, bed: "1:00", wake: "9:00", color: "#7EC8E3" },
  { label: "휴식일", sub: "", start: 5.5, end: 14.0, bed: "1:30", wake: "10:00", color: "#A0B0FF" },
  { label: "훈련일", sub: "새벽 기상", start: 4.67, end: 9.0, bed: "0:40", wake: "5:00", color: "#4355B0" },
];
const TICKS = [{ h: 4, l: "자정" }, { h: 8, l: "새벽 4시" }, { h: 12, l: "오전 8시" }];

const SUB_STATS = [
  { k: "입면까지", v: "100분", n: "23:00 → 0:40" },
  { k: "총 수면", v: "5~6시간", n: "야간 각성 2회" },
  { k: "크로노타입", v: "확실한 저녁형", n: "취침 희망 1:00" },
];

const PROBLEMS = [
  { n: "01", tag: "입면 각성", flow: "성적 긴장이 밤까지 → 잠들기 100분", ev: "대회 며칠 전부터 잠들지 못하고, 라운드가 잘 풀리지 않은 날은 실수한 샷이 새벽까지 재생됩니다. 취침 전 스마트폰으로 경기 영상·SNS를 40분 보는 것도 각성을 키웁니다. 파국적 사고 5/5 · 수면 불안 4/5. 잠을 방해하는 것은 피로가 아니라 긴장입니다.", src: "과각성 · 조건화된각성 · 메타인지신념" },
  { n: "02", tag: "리듬 불일치", flow: "확실한 저녁형 ↔ 새벽 스케줄 → 사회적 시차 175분", ev: "몸이 원하는 취침은 새벽 1시이지만 새벽 훈련·이른 티오프로 5시에 기상합니다. 매주 시차를 겪는 셈이라 낮 졸림과 '충분히 자도 피곤함'으로 나타납니다. 아침 햇빛도 가끔만 보아 리듬 고정이 약합니다.", src: "크로노타입 · 수면측정척도 · 광노출타이밍" },
  { n: "03", tag: "원정 부적응", flow: "잦은 원정 → 첫 이틀 거의 못 잠 (적응 3일+)", ev: "낯선 호텔에서 첫 이틀은 거의 잠들지 못하다가 사흘째에 겨우 적응합니다. 생체시계는 하루 1~1.5시간씩만 조율되므로 큰 이동은 2~3일 적응이 정상입니다. '적응력'보다 사전 프로토콜이 관건입니다.", src: "생체시계(SCN) · 교대근무 회복설계" },
  { n: "＋", tag: "악화 요인 · 카페인", flow: "부스터+커피 2잔 (오후 4시) → 깊은 잠 훼손", ev: "카페인 반감기가 5~6시간이라 밤까지 남습니다. 오후 3시 이후 섭취는 깊은잠(N3)을 약 27% 감소시킵니다. 새벽에 깬 뒤 오래 뒤척이는 습관도 효율을 더 낮춥니다.", src: "카페인과수면 · 자극조절법", minor: true },
];

const PLAN = [
  { p: "P1", tone: "indigo", t: "각성 내리기 · 이완수면으로 전환", d: "취침 2시간 전 걱정시간(종이에 15분 기록)으로 반추를 미리 비웁니다. 침대에서는 4-7-8 호흡·근이완(PMR)으로 몸을 이완으로 전환합니다. 취침 40분 전부터 경기 영상·SNS를 끊고 버퍼존(독서·스트레칭)으로 대체합니다. 걱정을 구체적으로 기록하면 입면이 25분에서 16분으로 단축된다는 연구가 있습니다(Scullin 2018)." },
  { p: "P2", tone: "indigo", t: "침대를 다시 '잠자는 곳'으로", d: "누워서 20분이 지나도 잠들지 못하면 일어나 버퍼존에서 이완한 뒤, 졸릴 때 다시 눕는 자극조절을 적용합니다. 침대에 머무는 시간을 실제 수면에 맞춰 조이는 수면제한으로 효율을 높입니다. 같은 방식으로 코칭한 사례에서 효율이 66%에서 91%로 개선되었습니다." },
  { p: "P3", tone: "indigo", t: "흐트러진 리듬 고정 · 기상 앵커 + 아침 햇빛", d: "저녁형을 억지로 바꾸지 않되, 기상 시간을 주 7일 일정하게 고정해 사회적 시차(175분)를 줄입니다. 기상 후 1시간 내 아침 햇빛을 매일 확보해 밤 멜라토닌이 제때 분비되게 합니다. 취침은 무리 없이 조금씩 앞당깁니다." },
  { p: "P4", tone: "indigo", t: "카페인 컷오프 조정", d: "취침 8시간 전으로 마지막 섭취 시각을 당깁니다. 훈련 전 부스터는 오전으로 모으고, 오후 늦은 커피는 무카페인으로 대체합니다." },
  { p: "P5", tone: "sky", t: "원정 사전 프로토콜", d: "원정 전 수면을 미리 저축하고, 도착 첫 이틀은 아침 햇빛·저녁 빛 조절로 리듬을 당깁니다. '첫 이틀은 원래 적응 기간'이라는 점을 알고 대비하면 불안이 줄어듭니다." },
];

const NEXT = [
  { t: "수면일지 시작", d: "매일 취침·기상·컨디션을 기록합니다. 2주 실측이 쌓이면 다음 리포트는 실제 데이터로 제공됩니다." },
  { t: "취침 루틴 3종 고정", d: "① 걱정시간 15분 ② 취침 전 스마트폰 차단 후 버퍼존 ③ 4-7-8 호흡 또는 PMR" },
  { t: "기상 앵커 + 아침 햇빛", d: "주말을 포함해 같은 시간에 기상하고, 1시간 내 햇빛을 10분 확보합니다." },
  { t: "카페인 마지막 섭취 앞당기기", d: "취침 8시간 전까지로 제한하고, 목표 시각을 함께 정합니다." },
  { t: "2주 뒤 재측정", d: "수면효율·입면·사회적 시차 변화를 확인한 뒤 프로토콜을 조정합니다." },
];

/* ---------- 파트 ---------- */
function SectionHead({ label, title, desc }) {
  return (
    <div>
      <div className="text-[11px] font-bold tracking-[0.14em] text-primary">{label}</div>
      <h2 className="text-[17px] sm:text-[18px] font-extrabold tracking-tight mt-1">{title}</h2>
      {desc && <p className="text-[13.5px] text-muted-foreground mt-1 leading-relaxed">{desc}</p>}
    </div>
  );
}

// 커스텀 24시간 수면 타임라인
function ScheduleTimeline() {
  return (
    <Card>
      <CardContent className="p-4 sm:p-5">
        <div className="text-base font-semibold tracking-tight">수면 스케줄 정렬 상태</div>
        <p className="text-[13px] text-muted-foreground mt-0.5">막대는 실제 잠든 구간입니다. 훈련일이 몸이 원하는 리듬에서 얼마나 밀렸는지 보여줍니다.</p>

        <div className="mt-5 space-y-3.5">
          {ROWS.map((r) => (
            <div key={r.label} className="flex items-center gap-2.5">
              <div className="w-[52px] sm:w-[64px] shrink-0 text-right">
                <div className="text-[12.5px] font-semibold leading-tight">{r.label}</div>
                {r.sub && <div className="text-[10px] text-muted-foreground leading-tight">{r.sub}</div>}
              </div>
              <div className="relative flex-1 h-8">
                {/* gridlines */}
                {TICKS.map((t) => (
                  <div key={t.h} className="absolute top-0 bottom-0 w-px bg-border" style={{ left: `${pct(t.h)}%` }} />
                ))}
                {/* bar */}
                <div className="absolute top-1/2 -translate-y-1/2 h-[22px] rounded-md flex items-center"
                  style={{ left: `${pct(r.start)}%`, width: `${pct(r.end - r.start)}%`, background: r.color }}>
                  <span className="text-[10px] font-semibold text-white/90 pl-1.5 whitespace-nowrap">{r.bed}</span>
                </div>
                {/* wake label */}
                <span className="absolute top-1/2 -translate-y-1/2 text-[11px] font-bold text-navy whitespace-nowrap"
                  style={{ left: `calc(${pct(r.end)}% + 6px)` }}>{r.wake}</span>
              </div>
            </div>
          ))}
        </div>

        {/* time axis */}
        <div className="flex items-center gap-2.5 mt-1.5">
          <div className="w-[52px] sm:w-[64px] shrink-0" />
          <div className="relative flex-1 h-4">
            {TICKS.map((t) => (
              <span key={t.h} className="absolute text-[10px] text-muted-foreground -translate-x-1/2" style={{ left: `${pct(t.h)}%` }}>{t.l}</span>
            ))}
          </div>
        </div>

        <div className="mt-4 rounded-lg bg-[#f1f2fb] border border-[#dde1f6] p-3.5 text-[13px] leading-relaxed text-[#3a3f52]">
          <b>4시간 간극.</b> 훈련일 기상(새벽 5시)이 몸이 원하는 기상(오전 9시)보다 4시간 이르고, 수면도 4.3시간으로 짧게 잘립니다. 이 반복되는 어긋남이 사회적 시차 175분의 정체입니다. 기상 시간 고정과 아침 햇빛이 1순위 처방입니다.
        </div>
      </CardContent>
    </Card>
  );
}

/* ---------- 페이지 ---------- */
export default function SampleReport() {
  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      <div className="mx-auto max-w-[940px] px-4 sm:px-6 py-6 sm:py-9 space-y-7">

        {/* 샘플 표시 */}
        <div className="rounded-lg bg-muted px-4 py-2.5 text-[12px] text-muted-foreground flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-navy text-white">SAMPLE</span>
          예시 데이터로 구성된 샘플 리포트입니다.
        </div>

        {/* Hero + KPI 스트립 */}
        <div className="rounded-xl overflow-hidden text-white" style={{ background: "linear-gradient(135deg,#0D1B2A 0%,#22356d 100%)" }}>
          <div className="px-5 sm:px-8 pt-6 sm:pt-8">
            <div className="text-[11px] font-bold tracking-[0.18em]" style={{ color: "#7EC8E3" }}>운동선수 수면 코칭</div>
            <div className="mt-3 flex items-end justify-between gap-3 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">1차 수면 평가 리포트</h1>
              <span className="text-[11px] sm:text-xs font-semibold rounded-full px-3 py-1.5"
                style={{ background: "rgba(126,200,227,.14)", border: "1px solid rgba(126,200,227,.4)", color: "#c4e7f5" }}>1차 평가 · 초기</span>
            </div>
            <div className="mt-2.5">
              <div className="text-[15px] font-semibold text-white">이서연 <span className="text-[13px] font-normal text-white/65 ml-0.5">골프 · 프로</span></div>
              <div className="mt-1 text-[12px] text-white/50">사전 질문지 기반 · 2026. 08. 05 작성</div>
            </div>
          </div>
          <div className="mt-6 grid grid-cols-4 border-t border-white/10">
            {HERO_KPI.map((k, i) => (
              <div key={k.k} className={`px-3 sm:px-6 py-4 ${i > 0 ? "border-l border-white/10" : ""}`}>
                <div className="text-[19px] sm:text-[23px] font-bold tracking-tight tabular-nums leading-none">
                  {k.v}<span className="text-[11px] sm:text-xs font-semibold text-white/60 ml-0.5">{k.u}</span>
                </div>
                <div className="text-[10.5px] sm:text-[12px] text-white/60 mt-1.5 leading-tight">{k.k}</div>
              </div>
            ))}
          </div>
        </div>

        {/* IMPRESSION — 종합 소견 (최상단, 결론 먼저) */}
        <section className="rounded-xl bg-[#f5f6fb] border border-[#e3e6f4] p-5 sm:p-6">
          <div className="text-[11px] font-bold tracking-[0.16em] text-primary">IMPRESSION · 종합 소견</div>
          <p className="text-[14px] sm:text-[15px] leading-relaxed text-foreground mt-2.5">
            잠이 부족한 것이 아니라, 성적 긴장이 밤까지 이어지는 긴장수면과 생체리듬이 경기 스케줄과 어긋난 상태입니다. 긴장을 이완으로 바꾸고, 흐트러진 리듬을 다시 고정하는 것이 핵심 방향입니다.
          </p>
          <div className="mt-4 pt-4 border-t border-[#e3e6f4] flex flex-wrap items-center gap-x-4 gap-y-1.5">
            <span className="text-[12px] font-bold text-[#a25a48]">주의 신호</span>
            {FLAGS.map((f) => (
              <span key={f} className="text-[12px] text-[#5c6270] flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "#d98a72" }} />{f}
              </span>
            ))}
          </div>
        </section>

        {/* FINDINGS — 측정 지표 + 차트 */}
        <section className="space-y-4">
          <SectionHead label="FINDINGS" title="수면 측정 소견"
            desc="위험 질환 신호(코골이·무호흡)는 없습니다. 구조·습관·심리에서 개선 가능한 불면입니다." />

          {/* 부가 지표 칩 */}
          <div className="grid grid-cols-3 gap-2.5">
            {SUB_STATS.map((s) => (
              <div key={s.k} className="rounded-lg border border-border bg-card p-3">
                <div className="text-[11.5px] text-muted-foreground">{s.k}</div>
                <div className="text-[15px] sm:text-[16px] font-bold tracking-tight mt-0.5">{s.v}</div>
                <div className="text-[10.5px] text-muted-foreground mt-0.5 leading-tight">{s.n}</div>
              </div>
            ))}
          </div>

          {/* 차트 */}
          <ScheduleTimeline />
        </section>

        {/* 세부 소견 — 문제 */}
        <section className="space-y-4">
          <SectionHead label="DETAIL" title="세부 소견"
            desc="측정 결과를 살펴보면, 세 갈래가 서로 맞물려 있습니다." />
          <div className="space-y-3">
            {PROBLEMS.map((p) => (
              <div key={p.tag} className="rounded-lg border border-border bg-card p-4 sm:p-5">
                <div className="flex items-baseline gap-2.5">
                  <span className="text-[15px] font-extrabold tabular-nums" style={{ color: "#c9694f" }}>{p.n}</span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-md" style={{ background: "#f5ddd4", color: "#a25a48" }}>{p.tag}</span>
                </div>
                <div className="text-[14.5px] font-semibold tracking-tight text-navy mt-2">{p.flow}</div>
                <div className="text-[13px] text-[#5c6270] mt-1.5 leading-relaxed">{p.ev}</div>
              </div>
            ))}
          </div>
        </section>

        {/* PLAN */}
        <section className="space-y-4">
          <SectionHead label="PLAN" title="1차 코칭 방향"
            desc="준비도가 4.8로 매우 높습니다. 우선순위대로 하나씩 적용하면 빠르게 반응할 것으로 기대됩니다." />
          <div className="space-y-3">
            {PLAN.map((p) => {
              const c = p.tone === "sky" ? { chip: "#d8eef6", txt: "#2b7d9e" } : { chip: "#dee2f6", txt: "#3f4fa6" };
              return (
                <div key={p.p} className="rounded-lg border border-border bg-card p-4 sm:p-5 flex items-start gap-3.5">
                  <span className="shrink-0 text-[12px] font-extrabold px-2.5 py-1 rounded-md mt-0.5" style={{ background: c.chip, color: c.txt }}>{p.p}</span>
                  <div>
                    <div className="text-[14.5px] font-semibold tracking-tight text-navy">{p.t}</div>
                    <div className="text-[13px] text-[#4a4f60] mt-1.5 leading-relaxed">{p.d}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* NEXT */}
        <section className="space-y-3">
          <SectionHead label="NEXT 2 WEEKS" title="다음 2주 권고"
            desc={'"완벽히"보다 "가볍게 시작"이 중요합니다. 애써 자려는 것 자체가 각성이 되기 때문입니다.'} />
          <div className="rounded-lg border border-border bg-card px-4 sm:px-5">
            {NEXT.map((n, i) => (
              <div key={n.t} className={`flex gap-3 items-start py-3.5 ${i < NEXT.length - 1 ? "border-b border-border" : ""}`}>
                <span className="shrink-0 mt-1 w-2 h-2 rounded-full bg-primary" />
                <div>
                  <div className="text-[14px] font-semibold">{i + 1}. {n.t}</div>
                  <div className="text-[12.5px] text-muted-foreground mt-0.5 leading-relaxed">{n.d}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="pt-5 flex justify-center">
          <img src="/noct-logo.png" alt="NOCT Research" className="h-4 w-auto opacity-35" />
        </div>

      </div>
    </div>
  );
}
