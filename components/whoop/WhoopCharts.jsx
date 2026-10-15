"use client";
// components/whoop/WhoopCharts.jsx — WHOOP 최근 N일 차트 (선수 /whoop · 코치 선수상세 공용)
// days: lib/whoop/read.js getWhoopDays() 결과. 점수 계산 전(≠SCORED) 값은 null → 막대/점 없이 비우고 "미정" 표기.
import { ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { cn } from "../../lib/utils";

const C = { deep: "#4355B0", rem: "#7EC8E3", light: "#A0B0FF", awake: "#D5DAE3", line: "#4355B0", grid: "#EEF0F3", axis: "#9AA0AB" };
const H = (ms) => (ms == null ? null : Math.round((ms / 3600000) * 10) / 10);
const round = (v, d = 0) => (v == null ? null : Math.round(v * 10 ** d) / 10 ** d);

function ChartCard({ title, caption, missing, children, compact }) {
  return (
    <div className={cn("bg-card border border-border rounded-2xl p-4", compact && "rounded-xl")}>
      <div className="flex items-baseline justify-between gap-2">
        <div className="text-[15px] font-semibold text-foreground">{title}</div>
        {caption ? <div className="text-[12px] text-muted-foreground">{caption}</div> : null}
      </div>
      <div className="h-[170px] mt-3 -ml-2">{children}</div>
      {missing.length ? (
        <div className="text-[12px] text-muted-foreground mt-2">미정 (점수 계산 전): {missing.join(", ")}</div>
      ) : null}
    </div>
  );
}

const axisProps = { tick: { fontSize: 11, fill: C.axis }, tickLine: false, axisLine: false };

function Legend({ items }) {
  return (
    <div className="flex gap-3 mt-2 flex-wrap">
      {items.map(([label, color]) => (
        <span key={label} className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground">
          <span className="w-2.5 h-2.5 rounded-sm" style={{ background: color }} />{label}
        </span>
      ))}
    </div>
  );
}

export default function WhoopCharts({ days, compact = false }) {
  if (!days?.length) {
    return <div className="text-[13px] text-muted-foreground p-4">최근 2주 WHOOP 기록이 아직 없어요.</div>;
  }
  const rows = days.map((d) => ({
    label: d.label,
    deep: H(d.deepMs), rem: H(d.remMs), light: H(d.lightMs), awake: H(d.awakeMs),
    eff: round(d.sleepEffPct), rec: round(d.recoveryScore), hrv: round(d.hrvMs, 1), rhr: round(d.restingHr),
  }));
  const missSleep = days.filter((d) => !d.sleepScored).map((d) => d.label);
  const missRec = days.filter((d) => !d.recScored).map((d) => d.label);

  const lineChart = (key, unit, domain) => (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={rows} margin={{ top: 6, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid stroke={C.grid} vertical={false} />
        <XAxis dataKey="label" {...axisProps} interval="preserveStartEnd" />
        <YAxis {...axisProps} width={34} domain={domain} />
        <Tooltip formatter={(v) => [`${v}${unit}`]} />
        <Line type="monotone" dataKey={key} stroke={C.line} strokeWidth={2} dot={{ r: 3 }} connectNulls={false} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  );

  return (
    <div className={cn("grid gap-3", compact ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1")}>
      <div>
        <ChartCard title="수면 단계" caption="시간" missing={missSleep} compact={compact}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} margin={{ top: 6, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid stroke={C.grid} vertical={false} />
              <XAxis dataKey="label" {...axisProps} interval="preserveStartEnd" />
              <YAxis {...axisProps} width={34} />
              <Tooltip formatter={(v, n) => [`${v}시간`, { deep: "깊은 수면", rem: "렘 수면", light: "얕은 수면", awake: "깸" }[n]]} />
              <Bar dataKey="deep" stackId="s" fill={C.deep} isAnimationActive={false} />
              <Bar dataKey="rem" stackId="s" fill={C.rem} isAnimationActive={false} />
              <Bar dataKey="light" stackId="s" fill={C.light} isAnimationActive={false} />
              <Bar dataKey="awake" stackId="s" fill={C.awake} radius={[4, 4, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <Legend items={[["깊은 수면", C.deep], ["렘", C.rem], ["얕은 수면", C.light], ["깸", C.awake]]} />
      </div>
      <ChartCard title="회복 점수" caption="%" missing={missRec} compact={compact}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 6, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid stroke={C.grid} vertical={false} />
            <XAxis dataKey="label" {...axisProps} interval="preserveStartEnd" />
            <YAxis {...axisProps} width={34} domain={[0, 100]} />
            <Tooltip formatter={(v) => [`${v}%`, "회복"]} />
            <Bar dataKey="rec" fill={C.line} radius={[4, 4, 0, 0]} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
      <ChartCard title="HRV" caption="ms" missing={missRec} compact={compact}>{lineChart("hrv", "ms", ["auto", "auto"])}</ChartCard>
      <ChartCard title="안정시 심박" caption="bpm" missing={missRec} compact={compact}>{lineChart("rhr", "bpm", ["auto", "auto"])}</ChartCard>
      <ChartCard title="수면 효율" caption="%" missing={missSleep} compact={compact}>{lineChart("eff", "%", [50, 100])}</ChartCard>
    </div>
  );
}
