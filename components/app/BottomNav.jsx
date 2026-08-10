"use client";
// components/app/BottomNav.jsx — 선수앱 공용 하단 4탭 네비.
// 흰 배경 · top border · shadow 없음 · Lucide · active만 primary. (디자인 시스템 v2)
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, PenSquare, FileText, User } from "lucide-react";
import { cn } from "../../lib/utils";

const TABS = [
  { href: "/portal", label: "홈", icon: Home, match: (p) => p === "/portal" || p === "/" },
  { href: "/log", label: "기록", icon: PenSquare, match: (p) => p.startsWith("/log") },
  { href: "/reports", label: "리포트", icon: FileText, match: (p) => p.startsWith("/reports") || p.startsWith("/report") },
  { href: "/me", label: "내정보", icon: User, match: (p) => p.startsWith("/me") || p.startsWith("/profile") },
];

export default function BottomNav() {
  const pathname = usePathname() || "";
  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-40 flex bg-card border-t border-border pt-[10px] pb-[max(12px,env(safe-area-inset-bottom))]">
      {TABS.map((t) => {
        const on = t.match(pathname);
        const Icon = t.icon;
        return (
          <Link key={t.href} href={t.href}
            className={cn("flex-1 flex flex-col items-center gap-1", on ? "text-primary" : "text-muted-foreground")}>
            <Icon className="w-[22px] h-[22px]" strokeWidth={2} />
            <span className={cn("text-[11px]", on ? "font-semibold" : "font-medium")}>{t.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
