"use client";

/* 완전 커스텀 가입 폼 (Clerk headless useSignUp). 이메일+비번 → 인증코드 → /portal. */

import { useState, useEffect } from "react";
import { useSignUp, useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import AuthShell from "../../../components/auth/AuthShell";
import { krError } from "../../../components/auth/clerkError";

export default function SignUpPage() {
  const { isLoaded, signUp, setActive } = useSignUp();
  const { isSignedIn } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState("form"); // form | verify
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isSignedIn) router.replace("/portal");
  }, [isSignedIn, router]);

  async function onCreate(e) {
    e.preventDefault();
    if (!isLoaded || loading) return;
    setLoading(true);
    setError("");
    try {
      await signUp.create({
        emailAddress: email.trim(),
        password,
        unsafeMetadata: { name: name.trim() },
      });
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setStep("verify");
      setLoading(false);
    } catch (err) {
      setError(krError(err, "가입 정보를 확인해 주세요."));
      setLoading(false);
    }
  }

  async function onVerify(e) {
    e.preventDefault();
    if (!isLoaded || loading) return;
    setLoading(true);
    setError("");
    try {
      const res = await signUp.attemptEmailAddressVerification({ code: code.trim() });
      if (res.status === "complete") {
        await setActive({ session: res.createdSessionId });
        router.push("/portal");
      } else {
        setError("인증을 완료하지 못했어요. 코드를 다시 확인해 주세요.");
        setLoading(false);
      }
    } catch (err) {
      setError(krError(err, "코드가 올바르지 않아요."));
      setLoading(false);
    }
  }

  if (isSignedIn) {
    return (
      <AuthShell>
        <div className="card">
          <h1>로그인됐어요</h1>
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
            <h1>회원가입</h1>
            <form onSubmit={onCreate}>
              {error && <div className="err">{error}</div>}
              <div>
                <label>이름</label>
                <input
                  type="text"
                  autoComplete="name"
                  placeholder="선수 이름"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
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
                  autoComplete="new-password"
                  placeholder="8자 이상"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              {/* Clerk 봇 방지 위젯 (활성 시에만 표시) */}
              <div id="clerk-captcha" />
              <button className="btn" type="submit" disabled={loading}>
                {loading ? "만드는 중…" : "계정 만들기"}
              </button>
            </form>
            <p className="alt">
              이미 계정이 있나요? <a href="/sign-in">로그인</a>
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
