"use client";

/* 포털 로그아웃 — 아이콘 전용 유틸 버튼 (상태 pill과 위계 구분). 클릭 → /sign-in */

import { useClerk } from "@clerk/nextjs";

export default function LogoutButton() {
  const { signOut } = useClerk();
  return (
    <button
      className="logout"
      type="button"
      title="로그아웃"
      aria-label="로그아웃"
      onClick={() => signOut({ redirectUrl: "/sign-in" })}
    >
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <polyline points="16 17 21 12 16 7" />
        <line x1="21" y1="12" x2="9" y2="12" />
      </svg>
    </button>
  );
}
