"use client";

/* 완전 커스텀 로그인 폼 (Clerk headless useSignIn). UI 100% NOCT.
   인스턴스에 2차 인증(이메일 코드)이 켜져 있으면: 비번(1차) → 이메일 코드(2차) → 로그인.
   2FA가 꺼져 있으면 비번만으로 바로 complete 되어 코드 단계는 건너뜀. */

import { useState, useEffect } from "react";
import { useSignIn, useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import AuthShell from "../../../components/auth/AuthShell";
import { krError } from "../../../components/auth/clerkError";

// 로그인 후 돌아갈 곳: 보호 링크(예: /coach/assign)로 왔으면 그곳으로, 아니면 포털.
function getRedirect() {
  if (typeof window === "undefined") return "/portal";
  const p = new URLSearchParams(window.location.search).get("redirect_url");
  // 외부 URL 방지 — 내부 경로만 허용
  return p && p.startsWith("/") ? p : "/portal";
}

export default function SignInPage() {
  const { isLoaded, signIn, setActive } = useSignIn();
  const { isSignedIn } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState("form"); // form | verify
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // 이미 로그인된 상태면 로그인 페이지 대신 허브로
  useEffect(() => {
    if (isSignedIn) router.replace(getRedirect());
  }, [isSignedIn, router]);

  // 2차 인증(이메일 코드) 준비 — 코드 발송 후 입력 화면으로
  async function startSecondFactor(res) {
    const emailFactor = (res.supportedSecondFactors || []).find(
      (f) => f.strategy === "email_code"
    );
    if (!emailFactor) {
      setError("로그인을 완료하지 못했어요. 코치에게 문의해 주세요.");
      setLoading(false);
      return;
    }
    await signIn.prepareSecondFactor({
      strategy: "email_code",
      emailAddressId: emailFactor.emailAddressId,
    });
    setStep("verify");
    setError("");
    setLoading(false);
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (!isLoaded || loading) return;
    setLoading(true);
    setError("");
    try {
      const res = await signIn.create({ identifier: email.trim(), password });
      if (res.status === "complete") {
        await setActive({ session: res.createdSessionId });
        router.push(getRedirect());
      } else if (res.status === "needs_second_factor") {
        await startSecondFactor(res);
      } else {
        setError("로그인을 완료하지 못했어요. 코치에게 문의해 주세요.");
        setLoading(false);
      }
    } catch (err) {
      // 이미 로그인된 세션이면 허브로
      if (err?.errors?.[0]?.code === "session_exists" || err?.errors?.[0]?.code === "identifier_already_signed_in") {
        router.replace(getRedirect());
        return;
      }
      setError(krError(err, "이메일 또는 비밀번호를 확인해 주세요."));
      setLoading(false);
    }
  }

  async function onVerify(e) {
    e.preventDefault();
    if (!isLoaded || loading) return;
    setLoading(true);
    setError("");
    try {
      const res = await signIn.attemptSecondFactor({
        strategy: "email_code",
        code: code.trim(),
      });
      if (res.status === "complete") {
        await setActive({ session: res.createdSessionId });
        router.push(getRedirect());
      } else {
        setError("인증을 완료하지 못했어요. 코드를 다시 확인해 주세요.");
        setLoading(false);
      }
    } catch (err) {
      setError(krError(err, "코드가 올바르지 않아요."));
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
        {step === "form" ? (
          <>
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
          </>
        ) : (
          <>
            <h1>이메일을 확인해 주세요</h1>
            <p className="lead">{email}로 보낸 6자리 코드를 입력해 주세요.</p>
            <form onSubmit={onVerify}>
              {error && <div className="err">{error}</div>}
              <div>
                <label>인증 코드</label>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="000000"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <button className="btn" type="submit" disabled={loading}>
                {loading ? "확인 중…" : "확인"}
              </button>
            </form>
            <p className="hint">코드가 안 왔나요? 스팸함도 확인해 주세요.</p>
          </>
        )}
      </div>
    </AuthShell>
  );
}
