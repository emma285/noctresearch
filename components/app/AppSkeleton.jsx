// 탭 전환 시 즉시 뜨는 스켈레톤 (loading.js에서 사용). 셸+하단탭 유지 → 전환이 즉각 반응.
import AppShell from "./AppShell";

const Bar = ({ w = "w-full", h = "h-4", extra = "" }) => (
  <div className={`${h} ${w} rounded-lg bg-white/15 ${extra}`} />
);
const Card = () => (
  <div className="h-[72px] rounded-2xl bg-card border border-border animate-pulse" />
);

export default function AppSkeleton() {
  return (
    <AppShell>
      {/* 히어로(네이비) 스켈레톤 */}
      <div className="bg-navy px-5 pt-[calc(env(safe-area-inset-top)+22px)] pb-7">
        <div className="animate-pulse space-y-3">
          <Bar w="w-16" h="h-4" />
          <Bar w="w-40" h="h-7" />
          <div className="flex gap-6 pt-3">
            <Bar w="w-14" h="h-9" /><Bar w="w-14" h="h-9" /><Bar w="w-14" h="h-9" />
          </div>
        </div>
      </div>
      {/* 콘텐츠 카드 스켈레톤 */}
      <div className="px-5 pt-6 space-y-3">
        <div className="h-4 w-28 rounded bg-muted animate-pulse mb-1" />
        <Card /><Card /><Card />
      </div>
    </AppShell>
  );
}
