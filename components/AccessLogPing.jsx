"use client";
// 로그인 접속 기록 — 로그인된 상태로 앱이 열리면 세션당 한 번 /api/access-log/login 호출.
import { useEffect } from "react";
import { useAuth } from "@clerk/nextjs";

export default function AccessLogPing() {
  const { isLoaded, isSignedIn, sessionId } = useAuth();

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !sessionId) return;
    const key = `noct-login-logged:${sessionId}`;
    try { if (sessionStorage.getItem(key)) return; } catch {}
    fetch("/api/access-log/login", { method: "POST" })
      .then((r) => { if (r.ok) try { sessionStorage.setItem(key, "1"); } catch {} })
      .catch(() => {});
  }, [isLoaded, isSignedIn, sessionId]);

  return null;
}
