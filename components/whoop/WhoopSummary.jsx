// components/whoop/WhoopSummary.jsx — 지난밤 WHOOP 요약 (홈 카드·/whoop 상단 공용, 서버 렌더 가능)
// latest: getWhoopDays()의 마지막 원소. 점수 계산 전이면 "미정".
import { Metric, MetricRow } from "../app/primitives";
import { fmtDur } from "../../lib/whoop/format";

const hhmm = (min) => (min == null ? "-" : `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`);

export default function WhoopSummary({ latest }) {
  if (!latest) {
    return <div className="p-4 text-[13px] text-muted-foreground">최근 들어온 WHOOP 기록이 없어요. 자고 일어나면 자동으로 채워져요.</div>;
  }
  return (
    <div className="p-4">
      <div className="text-[13px] text-muted-foreground">
        {latest.label} 기상 · {hhmm(latest.bedMin)} ~ {hhmm(latest.wakeMin)}
      </div>
      <MetricRow className="mt-3">
        <Metric value={fmtDur(latest.asleepMs)} label="수면 시간" />
        <Metric value={latest.recoveryScore == null ? "미정" : Math.round(latest.recoveryScore)} unit={latest.recoveryScore == null ? "" : "%"} label="회복 점수" />
        <Metric value={latest.hrvMs == null ? "미정" : Math.round(latest.hrvMs)} unit={latest.hrvMs == null ? "" : "ms"} label="HRV" />
      </MetricRow>
    </div>
  );
}
