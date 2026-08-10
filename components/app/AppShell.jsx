// components/app/AppShell.jsx — 선수앱 공용 셸. 모바일 우선, 하단 4탭 네비 고정.
// 페이지는 <AppShell> 안에 hero + 콘텐츠를 넣는다. (디자인 시스템 v2)
import BottomNav from "./BottomNav";
import { cn } from "../../lib/utils";

/* props: nav(하단 네비 표시 여부, 기본 true), bodyClassName */
export default function AppShell({ children, nav = true, className, bodyClassName }) {
  return (
    <div className={cn("min-h-[100dvh] bg-background mx-auto w-full max-w-[430px]", nav && "pb-[calc(72px+env(safe-area-inset-bottom))]", className)}>
      <main className={bodyClassName}>{children}</main>
      {nav ? <BottomNav /> : null}
    </div>
  );
}

/* 콘텐츠 영역 표준 패딩 (page horizontal 20px) */
export function AppBody({ children, className }) {
  return <div className={cn("px-5 pb-6", className)}>{children}</div>;
}
