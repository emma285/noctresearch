"use client";

/* 완전 커스텀 가입 폼 (Clerk headless useSignUp). 이메일+비번 → 인증코드 → /portal.
   UI는 로그인(/sign-in)과 동일한 프리미엄 풀-네이비 톤. 로직은 보존. */

import { useState, useEffect } from "react";
import { useSignUp, useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { krError } from "../../../components/auth/clerkError";

// 풀-네이비 이머시브 레이아웃 (로그인과 동일). 모듈 레벨 — input 포커스 보존.
function AuthLayout({ title, sub, children, eyebrow }) {
  return (
    <div className="min-h-[100dvh] flex flex-col mx-auto w-full max-w-[430px] text-white"
      style={{ background: "linear-gradient(165deg,#0B1622 0%,#152740 55%,#1d3252 100%)" }}>
      <div className="px-7 pt-[calc(env(safe-area-inset-top)+28px)] flex items-center gap-2.5">
        <img src="/noct-logo.png" alt="NOCT" className="h-[21px] w-auto" style={{ filter: "brightness(0) invert(1)" }} />
        {eyebrow ? <><span className="w-px h-3.5 bg-white/25" /><span className="text-[13.5px] font-semibold text-white/85">{eyebrow}</span></> : null}
      </div>
      <div className="flex-1 flex flex-col justify-center px-7 pb-14">
        <h1 className="text-[30px] font-bold tracking-[-0.6px] leading-[1.25] whitespace-pre-line">{title}</h1>
        {sub ? <p className="text-[15px] text-white/55 mt-3.5 leading-relaxed">{sub}</p> : null}
        {children ? <div className="mt-9">{children}</div> : null}
      </div>
    </div>
  );
}
const INPUT = "w-full rounded-xl bg-white/[0.07] border border-white/[0.14] px-4 py-3.5 text-[15px] text-white placeholder:text-white/35 focus:outline-none focus:border-white/40 focus:bg-white/[0.10] transition-colors";
const BTN = "w-full mt-2 py-4 rounded-xl bg-white text-[#0B1622] text-base font-bold active:opacity-90 disabled:opacity-55 transition-opacity";

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
        // 코치에게 가입 알림 (#코칭). 실패해도 진행 막지 않음.
        fetch("/api/signup-notify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: name.trim(), email: email.trim() }),
        }).catch(() => {});
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
    return <AuthLayout title="로그인됐어요" sub="잠시만요, 내 코칭 공간으로 이동할게요…" />;
  }

  const err = error ? <div className="text-[13px] text-[#ffc4bb] bg-white/[0.06] border border-white/10 rounded-lg px-3.5 py-3">{error}</div> : null;

  return step === "form" ? (
    <AuthLayout eyebrow="수면코칭" title={"수면 코칭을\n시작해 볼까요."} sub="코치에게 안내받은 이메일로 가입해 주세요.">
      <form onSubmit={onCreate} className="flex flex-col gap-3">
        {err}
        <input type="text" autoComplete="name" placeholder="이름" value={name} onChange={(e) => setName(e.target.value)} required className={INPUT} />
        <input type="email" inputMode="email" autoComplete="email" placeholder="이메일" value={email} onChange={(e) => setEmail(e.target.value)} required className={INPUT} />
        <input type="password" autoComplete="new-password" placeholder="비밀번호 (8자 이상)" value={password} onChange={(e) => setPassword(e.target.value)} required className={INPUT} />
        {/* Clerk 봇 방지 위젯 (활성 시에만 표시) */}
        <div id="clerk-captcha" />
        <button type="submit" disabled={loading} className={BTN}>{loading ? "만드는 중…" : "계정 만들기"}</button>
      </form>
      <p className="text-[14px] text-white/50 text-center mt-7">이미 계정이 있나요? <a href="/sign-in" className="text-white font-semibold">로그인</a></p>
    </AuthLayout>
  ) : (
    <AuthLayout title={"이메일을\n확인해 주세요"} sub={`${email}로 보낸 6자리 코드를 입력해 주세요.`}>
      <form onSubmit={onVerify} className="flex flex-col gap-3">
        {err}
        <input type="text" inputMode="numeric" autoComplete="one-time-code" placeholder="000000" value={code} onChange={(e) => setCode(e.target.value)} required autoFocus className={INPUT + " text-center tracking-[0.3em]"} />
        <button type="submit" disabled={loading} className={BTN}>{loading ? "확인 중…" : "확인"}</button>
      </form>
      <p className="text-[13px] text-white/45 text-center mt-5">코드가 안 왔나요? 스팸함도 확인해 주세요.</p>
    </AuthLayout>
  );
}
