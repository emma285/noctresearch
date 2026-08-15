// 코치 포탈 데스크탑 셸 — 좌측 고정 사이드바(네비) + 넓은 본문. 모든 코치 화면 공용.
// 선수 포탈(모바일)과 완전 분리. active로 현재 메뉴 강조.
import Link from "next/link";
import { LayoutDashboard, Users, CalendarDays, FileText, ClipboardList } from "lucide-react";
import LogoutButton from "../portal/LogoutButton";

const NAV = [
  { key: "dashboard", label: "대시보드", href: "/portal", Icon: LayoutDashboard },
  { key: "athletes", label: "선수 관리", href: "/coach/clients", Icon: Users },
  { key: "sessions", label: "세션", href: "/coach/sessions", Icon: ClipboardList },
  { key: "schedule", label: "일정", href: "/coach/schedule", Icon: CalendarDays },
  { key: "reports", label: "리포트", href: "/coach/reports", Icon: FileText },
];

export default function CoachShell({ active = "dashboard", coachName = "코치", children }) {
  return (
    <div className="min-h-[100dvh] bg-[#f4f5f7] flex">
      {/* 사이드바 */}
      <aside className="hidden md:flex w-[210px] flex-none bg-[#111d2e] text-[#c7cfda] flex-col px-3.5 py-4 sticky top-0 h-[100dvh]">
        <div className="px-2 pt-1.5 pb-4 text-[14px] font-extrabold text-white tracking-[0.4px]">NOCT <span className="text-[#7EC8E3] font-semibold">COACH</span></div>
        <nav className="flex flex-col gap-0.5">
          {NAV.map(({ key, label, href, Icon, soon }) => {
            const on = key === active;
            return (
              <Link key={key} href={href}
                className={`flex items-center gap-2.5 text-[13.5px] font-semibold px-2.5 py-2.5 rounded-lg transition-colors ${on ? "bg-gradient-to-r from-[#3345a0] to-[#4355B0] text-white" : "text-[#aab4c2] hover:bg-white/5"}`}>
                <Icon className="w-4 h-4" strokeWidth={2} />
                <span className="flex-1">{label}</span>
                {soon ? <span className="text-[9.5px] font-bold text-[#6b7688] bg-white/5 px-1.5 py-0.5 rounded">곧</span> : null}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto flex items-center gap-2.5 px-2 py-2.5 border-t border-white/[0.08]">
          <span className="w-8 h-8 rounded-full bg-[#3a465a] flex items-center justify-center text-[12px] font-bold text-white">{(coachName || "코")[0]}</span>
          <div className="min-w-0 flex-1"><div className="text-[12.5px] font-bold text-white truncate">{coachName}</div><div className="text-[11px] text-[#8a94a2]">코치</div></div>
          <LogoutButton />
        </div>
      </aside>

      {/* 모바일 상단바 (사이드바 대체) */}
      <div className="md:hidden fixed top-0 inset-x-0 z-20 h-12 bg-[#111d2e] text-white flex items-center justify-between px-4">
        <span className="text-[13px] font-extrabold tracking-[0.4px]">NOCT <span className="text-[#7EC8E3]">COACH</span></span>
        <LogoutButton />
      </div>

      {/* 본문 */}
      <main className="flex-1 min-w-0 pt-12 md:pt-0">{children}</main>
    </div>
  );
}
