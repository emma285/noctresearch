// components/app/Hero.jsx — 풀블리드 flat 네이비 히어로 (A안) + 아주 미묘한 모노 네이비 그라데이션.
// 컬러 안 늘리고 깊이만. 유일한 브랜드 모먼트. (디자인 시스템 v2)
import { cn } from "../../lib/utils";

const HERO_BG = "linear-gradient(155deg,#0C1826 0%,#1d3252 100%)";

/* props: badge(노드/텍스트), dot(스카이 상태점), name, roleSuffix, sub, children(메트릭 등) */
export default function Hero({ badge, dot = true, name, roleSuffix, sub, children, topRight, className }) {
  return (
    <div className={cn("text-white px-5 pb-7 pt-[calc(env(safe-area-inset-top)+52px)]", className)} style={{ background: HERO_BG }}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {name ? (
            <div className="text-[28px] font-bold tracking-[-0.5px] leading-tight">
              {name}{roleSuffix ? <small className="text-sm font-medium opacity-55 ml-1.5">{roleSuffix}</small> : null}
            </div>
          ) : null}
          {sub ? <div className="text-sm opacity-[0.66] mt-2">{sub}</div> : null}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {badge ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-white/10 text-[#cfe0ff]">
              {dot ? <span className="w-1.5 h-1.5 rounded-full bg-accent" /> : null}
              {badge}
            </span>
          ) : null}
          {topRight || null}
        </div>
      </div>
      {children ? <div className="mt-6 pt-5 border-t border-white/[0.14]">{children}</div> : null}
    </div>
  );
}
