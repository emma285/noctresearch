"use client";

/* 완전 커스텀 로그인 폼 (Clerk headless useSignIn). UI 100% NOCT. */

import { useState, useEffect } from "react";
import { useSignIn, useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import AuthShell from "../../../components/auth/AuthShell";
import { krError } from "../../../components/auth/clerkError";

export default function SignInPage() {
  const { isLoaded, signIn, setActive } = useSignIn();
  const { isSignedIn } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // 이미 로그인된 상태면 로그인 페이지 대신 허브로
  useEffect(() => {
    if (isSignedIn) router.replace("/portal");
  }, [isSignedIn, router]);

  async function onSubmit(e) {
    e.preventDefault();
    if (!isLoaded || loading) return;
    setLoading(true);
    setError("");
    try {
      const res = await signIn.create({ identifier: email.trim(), password });
      if (res.status === "complete") {
        await setActive({ session: res.createdSessionId });
        router.push("/portal");
      } else {
        setError("로그인을 완료하지 못했어요. 코치에게 문의해 주세요.");
        setLoading(false);
      }
    } catch (err) {
      // 이미 로그인된 세션이면 허브로
      if (err?.errors?.[0]?.code === "session_exists" || err?.errors?.[0]?.code === "identifier_already_signed_in") {
        router.replace("/portal");
        return;
      }
      setError(krError(err, "이메일 또는 비밀번호를 확인해 주세요."));
      setLoading(false);
    }
  }

  // 로그인 상태면 폼 대신 이동 안내 (깜빡임 방지)
  if (isSignedIn) {
    return (
      <AuthShell>
        <div className="card">
          <h1>이미 로그인되어 있어요</h1>
          <p className="lead">잠시만요, 내 코칭 공간으로 이동할게요…</p>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <div className="card">
        <h1>로그인</h1>
        <p className="lead">등록하신 이메일로 로그인해 주세요.</p>
        <form onSubmit={onSubmit}>
          {error && <div className="err">{error}</div>}
          <div>
            <label>이메일</label>
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="you@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label>비밀번호</label>
            <input
              type="password"
              autoComplete="current-password"
              placeholder="비밀번호"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button className="btn" type="submit" disabled={loading}>
            {loading ? "로그인 중…" : "로그인"}
          </button>
        </form>
        <p className="alt">
          처음이신가요? <a href="/sign-up">가입하기</a>
        </p>
      </div>
    </AuthShell>
  );
}
