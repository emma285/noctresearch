"use client";

/* 완전 커스텀 로그인 폼 (Clerk headless useSignIn). UI 100% NOCT.
   인스턴스에 2차 인증(이메일 코드)이 켜져 있으면: 비번(1차) → 이메일 코드(2차) → 로그인.
   2FA가 꺼져 있으면 비번만으로 바로 complete 되어 코드 단계는 건너뜀. */

import { useState, useEffect } from "react";
import { useSignIn, useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { krError } from "../../../components/auth/clerkError";

// 풀-네이비 이머시브 로그인 레이아웃 (프리미엄 SaaS 톤). 모듈 레벨(컴포넌트 밖 — input 포커스 보존).
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

// 로그인 후 돌아갈 곳: 보호 링크(예: /coach/assign)로 왔으면 그곳으로,
// 아니면 루트(/)로 → 루트 스마트 라우팅이 진행중 선수는 /log(기록), 코치·온보딩전은 /portal로 분기.
function getRedirect() {
  if (typeof window === "undefined") return "/";
  const p = new URLSearchParams(window.location.search).get("redirect_url");
  // 외부 URL 방지 — 내부 경로만 허용
  return p && p.startsWith("/") ? p : "/";
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

  // 매직 링크(sign-in ticket)로 자동 로그인 — 프리뷰/서포트용. ?__clerk_ticket=...
  useEffect(() => {
    if (!isLoaded || !signIn) return;
    const ticket = new URLSearchParams(window.location.search).get("__clerk_ticket");
    if (!ticket) return;
    (async () => {
      try {
        const res = await signIn.create({ strategy: "ticket", ticket });
        if (res.status === "complete") {
          await setActive({ session: res.createdSessionId });
          router.replace(getRedirect());
        }
      } catch { /* 폼 로그인으로 폴백 */ }
    })();
  }, [isLoaded, signIn, setActive, router]);

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
    return <AuthLayout title="로그인됐어요" sub="잠시만요, 내 코칭 공간으로 이동할게요…" />;
  }

  const err = error ? <div className="text-[13px] text-[#ffc4bb] bg-white/[0.06] border border-white/10 rounded-lg px-3.5 py-3">{error}</div> : null;

  return step === "form" ? (
    <AuthLayout eyebrow="수면코칭" title={"Better Sleep,\nBetter Performance."} sub="등록하신 이메일로 로그인해 주세요.">
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        {err}
        <input type="email" inputMode="email" autoComplete="email" placeholder="이메일" value={email} onChange={(e) => setEmail(e.target.value)} required className={INPUT} />
        <input type="password" autoComplete="current-password" placeholder="비밀번호" value={password} onChange={(e) => setPassword(e.target.value)} required className={INPUT} />
        <button type="submit" disabled={loading} className={BTN}>{loading ? "로그인 중…" : "로그인"}</button>
      </form>
      <p className="text-[14px] text-white/50 text-center mt-7">처음이신가요? <a href="/sign-up" className="text-white font-semibold">가입하기</a></p>
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
