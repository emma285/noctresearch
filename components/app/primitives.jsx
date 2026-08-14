// components/app/primitives.jsx
// NOCT 선수앱 통합 디자인 시스템 v2 — 프리미티브 컴포넌트 (코드=디자인 1:1)
// 규칙: 카드↓(Surface+row/divider), radius 16/12, shadow 없음(border로 위계),
//       타이포 ≤700, Lucide 아이콘, flat, 브랜드 팔레트(primary=인디고, accent/positive=스카이).
// 참조: memory project-athlete-app-design-system · 목업 public/_plan/unified-design.html
import Link from "next/link";
import { ChevronRight, Check } from "lucide-react";
import { cn } from "../../lib/utils";

/* Surface — 흰 배경 + border + radius, 그림자 없음. 안에 row들을 divider로 grouping */
export function Surface({ className, children, ...props }) {
  return (
    <div className={cn("bg-card border border-border rounded-2xl overflow-hidden", className)} {...props}>
      {children}
    </div>
  );
}

/* SectionHeader — 20/700 한글 타이틀 (+옵션 caption). 영문 eyebrow 안 씀 */
export function SectionHeader({ title, caption, right, className }) {
  return (
    <div className={cn("mt-8 mb-3 flex items-end justify-between gap-3", className)}>
      <div className="min-w-0">
        <h2 className="text-xl font-bold text-foreground tracking-tight">{title}</h2>
        {caption ? <p className="text-[13px] text-muted-foreground mt-1">{caption}</p> : null}
      </div>
      {right ? <div className="text-[13px] font-semibold text-muted-foreground shrink-0 pb-0.5">{right}</div> : null}
    </div>
  );
}

/* Row — ListRow / ActionRow 공용.
   props: icon(Lucide 컴포넌트), title, desc, right(노드), href, onClick,
          action(=아이콘 primary), sub(=작은 서브행), value(우측 값 텍스트) */
export function Row({ icon: Icon, title, desc, right, href, onClick, action, sub, value, className }) {
  const inner = (
    <>
      {Icon ? (
        <Icon className={cn("shrink-0", sub ? "w-[18px] h-[18px]" : "w-[22px] h-[22px]", action ? "text-primary" : "text-muted-foreground")} strokeWidth={2} />
      ) : null}
      <div className="flex-1 min-w-0">
        <div className={cn("font-semibold text-foreground tracking-[-0.01em]", sub ? "text-sm" : "text-base")}>{title}</div>
        {desc ? <div className="text-[13px] text-muted-foreground mt-0.5">{desc}</div> : null}
      </div>
      {value ? <div className="text-[15px] font-semibold text-foreground">{value}</div> : null}
      {right !== undefined ? right : (href || onClick) && !value ? <ChevronRight className="w-[18px] h-[18px] text-[#B7BDC7] shrink-0" /> : null}
    </>
  );
  const base = cn(
    "flex items-center gap-3 first:border-t-0 border-t border-border",
    sub ? "px-4 py-[13px] bg-[#FBFBFC]" : "p-4",
    (href || onClick) && "active:bg-muted/40 transition-colors",
    className
  );
  if (href) return <Link href={href} className={base} onClick={onClick}>{inner}</Link>;
  if (onClick) return <button type="button" onClick={onClick} className={cn(base, "w-full text-left")}>{inner}</button>;
  return <div className={base}>{inner}</div>;
}

/* StatusBadge — pill. dot(스카이) 옵션. tone: 'primary'(기본) | 'plain' */
export function StatusBadge({ children, dot = false, tone = "primary", className }) {
  const tones = {
    primary: "bg-primary/10 text-primary",
    plain: "bg-muted text-muted-foreground",
  };
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full", tones[tone], className)}>
      {dot ? <span className="w-1.5 h-1.5 rounded-full bg-accent" /> : null}
      {children}
    </span>
  );
}

/* Metric + MetricRow — 큰 숫자 위주. hero(다크)에선 valueClassName/labelClassName으로 색 오버라이드 */
export function Metric({ value, unit, label, valueClassName, labelClassName }) {
  return (
    <div className="flex-1">
      <div className={cn("text-[18px] font-bold tracking-[-0.3px] leading-none", valueClassName || "text-foreground")}>
        {value}{unit ? <small className="text-[11px] font-medium opacity-70 ml-0.5">{unit}</small> : null}
      </div>
      <div className={cn("text-[11px] mt-1.5", labelClassName || "text-muted-foreground")}>{label}</div>
    </div>
  );
}
export function MetricRow({ children, className }) {
  return <div className={cn("flex", className)}>{children}</div>;
}

/* ReportRow — 날짜/차수 + 제목 + 서브 + chevron. soon=예정(연하게). isNew=새 공개 노트(강조+NEW) */
export function ReportRow({ date, badge, title, sub, href, soon = false, isNew = false }) {
  const inner = (
    <>
      <div className="w-[64px] shrink-0">
        <div className={cn("text-[13px] font-semibold", soon ? "text-[#AAB0BB]" : "text-foreground")}>{date}</div>
        {badge ? <div className={cn("text-[11px] font-semibold mt-1", soon ? "text-[#AAB0BB]" : "text-primary")}>{badge}</div> : null}
      </div>
      <div className="flex-1 min-w-0">
        <div className={cn("text-base font-semibold tracking-[-0.01em] flex items-center gap-1.5", soon ? "text-[#AAB0BB]" : "text-foreground")}>
          {title}
          {isNew ? <span className="text-[10.5px] font-extrabold text-white bg-[#EC4A54] px-[7px] py-[2px] rounded-full tracking-[0.3px] leading-none">NEW</span> : null}
        </div>
        {isNew
          ? <div className="text-[13px] font-semibold text-primary mt-0.5">새 코칭노트가 추가됐어요</div>
          : (sub ? <div className="text-[13px] text-muted-foreground mt-0.5">{sub}</div> : null)}
      </div>
      {!soon && href ? <ChevronRight className={cn("w-[18px] h-[18px] shrink-0", isNew ? "text-primary" : "text-[#B7BDC7]")} /> : null}
    </>
  );
  const base = cn("flex items-center gap-3.5 p-4 first:border-t-0 border-t border-border", isNew && "bg-[#f6f7fd]");
  if (href && !soon) return <Link href={href} className={cn(base, "active:bg-muted/40 transition-colors")}>{inner}</Link>;
  return <div className={base}>{inner}</div>;
}

/* CheckRow — 온보딩 체크리스트. done=완료(스카이 체크, 체크마크 네이비) */
export function CheckRow({ title, desc, done = false, href }) {
  const inner = (
    <>
      <span className={cn("w-6 h-6 rounded-full border-[1.75px] shrink-0 flex items-center justify-center",
        done ? "bg-accent border-accent text-navy" : "border-[#CDD2DB] text-transparent")}>
        {done ? <Check className="w-3.5 h-3.5" strokeWidth={2.5} /> : null}
      </span>
      <div className="flex-1 min-w-0">
        <div className={cn("text-base font-semibold tracking-[-0.01em]", done ? "text-muted-foreground" : "text-foreground")}>{title}</div>
        {desc ? <div className="text-[13px] text-muted-foreground mt-0.5">{desc}</div> : null}
      </div>
      {!done && href ? <ChevronRight className="w-[18px] h-[18px] text-[#B7BDC7] shrink-0" /> : null}
    </>
  );
  const base = "flex items-center gap-3.5 p-4 first:border-t-0 border-t border-border";
  if (href && !done) return <Link href={href} className={cn(base, "active:bg-muted/40 transition-colors")}>{inner}</Link>;
  return <div className={base}>{inner}</div>;
}

/* Streak — 주간 기록 점 (스카이=기록함) */
export function Streak({ days }) {
  // days: [{ label:'월', on:true }, ...]
  return (
    <div className="flex justify-between px-0.5 py-1">
      {days.map((d, i) => (
        <div key={i} className="flex flex-col items-center gap-[7px]">
          <span className={cn("w-[11px] h-[11px] rounded-full", d.on ? "bg-accent" : "bg-border")} />
          <span className="text-[11px] text-muted-foreground">{d.label}</span>
        </div>
      ))}
    </div>
  );
}
