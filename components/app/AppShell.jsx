// components/app/AppShell.jsx — 선수앱 공용 셸. 모바일 우선, 하단 4탭 네비 고정.
// 페이지는 <AppShell> 안에 hero + 콘텐츠를 넣는다. (디자인 시스템 v2)
import BottomNav from "./BottomNav";
import { cn } from "../../lib/utils";

/* props:
   - nav: 하단 4탭 표시 여부 (기본 true)
   - fill: 위저드형(전체 높이 고정 + 하단 CTA 고정)이면 true → h-[100dvh] flex. 기본은 스크롤 페이지(min-h)
   - className / bodyClassName: 추가 클래스
   모든 선수앱 화면은 이 셸 하나로 통일 (드리프트 방지). */
export default function AppShell({ children, nav = true, fill = false, className, bodyClassName }) {
  return (
    <div className={cn(
      "bg-background mx-auto w-full max-w-[430px]",
      fill ? "h-[100dvh] flex flex-col" : "min-h-[100dvh]",
      nav && "pb-[calc(72px+env(safe-area-inset-bottom))]",
      className,
    )}>
      <main className={cn(fill && "flex-1 flex flex-col min-h-0", bodyClassName)}>{children}</main>
      {nav ? <BottomNav /> : null}
    </div>
  );
}

/* 콘텐츠 영역 표준 패딩 (page horizontal 20px) */
export function AppBody({ children, className }) {
  return <div className={cn("px-5 pb-6", className)}>{children}</div>;
}
