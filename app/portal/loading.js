import AppSkeleton from "../../components/app/AppSkeleton";

// /portal은 선수(모바일 앱)·코치(데스크탑 콘솔) 공용 → 로딩 폴백도 화면폭으로 분기(CSS 미디어쿼리, 첫 페인트에 즉시 적용).
// 모바일: 앱 스켈레톤 / 데스크탑(md+): 코치 콘솔(사이드바+KPI+2단) 형태 스켈레톤 → 코치가 모바일 셸 깜빡임을 안 봄.
export default function Loading() {
  return (
    <>
      <div className="md:hidden">
        <AppSkeleton />
      </div>

      <div className="hidden md:flex min-h-[100dvh] bg-[#f4f5f7]">
        {/* 네이비 사이드바 (CoachShell과 동일 폭/색) */}
        <aside className="w-[210px] flex-none bg-[#111d2e] px-3.5 py-4">
          <div className="h-5 w-24 rounded bg-white/15 mb-6 animate-pulse" />
          <div className="space-y-1.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-9 rounded-lg bg-white/[0.06] animate-pulse" />
            ))}
          </div>
        </aside>

        {/* 본문 (대시보드 형태) */}
        <div className="flex-1 min-w-0 px-5 lg:px-7 py-6 max-w-[1440px]">
          <div className="h-7 w-40 rounded bg-black/10 animate-pulse mb-5" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-[86px] rounded-xl bg-white border border-[#e6e7eb] animate-pulse" />
            ))}
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-[18px] items-start">
            <div className="h-[380px] rounded-xl bg-white border border-[#e6e7eb] animate-pulse" />
            <div className="h-[380px] rounded-xl bg-white border border-[#e6e7eb] animate-pulse" />
          </div>
        </div>
      </div>
    </>
  );
}
