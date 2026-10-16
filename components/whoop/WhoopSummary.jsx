// components/whoop/WhoopSummary.jsx — 지난밤 WHOOP 요약 (홈 카드·/whoop 상단 공용, 서버 렌더 가능)
// latest: getWhoopDays()의 마지막 원소. 값이 없으면 상태(기록 없음/계산 중/계산 불가) 표시, 0은 0 그대로.
import { Metric, MetricRow } from "../app/primitives";
import { fmtDur, STATE_LABEL } from "../../lib/whoop/format";

const hhmm = (min) => (min == null ? "-" : `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`);

export default function WhoopSummary({ latest }) {
  if (!latest) {
    return <div className="p-4 text-[13px] text-muted-foreground">최근 들어온 WHOOP 기록이 없어요. 자고 일어나면 자동으로 채워져요.</div>;
  }
  if (latest.sleepState === "none") {
    return <div className="p-4 text-[13px] text-muted-foreground">{latest.label} · {STATE_LABEL.none}</div>;
  }
  const num = (v, state, unit) => (v == null ? { value: STATE_LABEL[state] || "-", unit: "" } : { value: Math.round(v), unit });
  const rec = num(latest.recoveryScore, latest.recState, "%");
  const hrv = num(latest.hrvMs, latest.recState, "ms");
  return (
    <div className="p-4">
      <div className="text-[13px] text-muted-foreground">
        {latest.label} 기상 · {hhmm(latest.bedMin)} ~ {hhmm(latest.wakeMin)}
      </div>
      <MetricRow className="mt-3">
        <Metric value={latest.asleepMs == null ? STATE_LABEL[latest.sleepState] || "-" : fmtDur(latest.asleepMs)} label="수면 시간" />
        <Metric value={rec.value} unit={rec.unit} label="회복 점수" />
        <Metric value={hrv.value} unit={hrv.unit} label="HRV" />
      </MetricRow>
    </div>
  );
}
