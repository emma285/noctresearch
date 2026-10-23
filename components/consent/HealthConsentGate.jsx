"use client";
// components/consent/HealthConsentGate.jsx — 건강 정보 동의 기록이 없는 선수(= 기존 가입자)에게 선수앱 진입 시 전체 화면 팝업.
// 신규 가입자는 가입 화면에서 동의하므로 뜨지 않음. 코치 여부는 서버(/api/consent)가 판단.
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useUser, useClerk } from "@clerk/nextjs";
import HealthConsentNotice from "./HealthConsentNotice";
import { hasHealthConsent, CONSENT_GATED_PATHS } from "../../lib/consent";

export default function HealthConsentGate() {
  const { isLoaded, isSignedIn, user } = useUser();
  const { signOut } = useClerk();
  const pathname = usePathname() || "";
  const gated = CONSENT_GATED_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
  const [required, setRequired] = useState(false);
  const [checked, setChecked] = useState(false);
  const [declined, setDeclined] = useState(false);
  const [saving, setSaving] = useState(false);

  const needsCheck = isLoaded && isSignedIn && gated && !hasHealthConsent(user);

  useEffect(() => {
    if (!needsCheck) return;
    fetch("/api/consent").then((r) => r.json()).then((d) => setRequired(!!d.required)).catch(() => {});
  }, [needsCheck]);

  if (!needsCheck || !required) return null;

  async function agree() {
    setSaving(true);
    try {
      const res = await fetch("/api/consent", { method: "POST" });
      if (!res.ok) throw new Error();
      await user.reload();
      setRequired(false);
    } catch {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center">
      <div className="w-full max-w-[430px] max-h-[90dvh] overflow-y-auto bg-background text-foreground rounded-t-3xl sm:rounded-3xl px-6 pt-7 pb-[calc(env(safe-area-inset-bottom)+24px)]">
        {declined ? (
          <>
            <h2 className="text-[20px] font-bold tracking-[-0.4px]">코칭을 이용할 수 없어요</h2>
            <p className="text-[14px] text-muted-foreground mt-3 leading-relaxed">
              수면 코칭은 건강 정보가 있어야 진행할 수 있어요. 이미 입력한 정보의 삭제나 문의는
              {" "}<a href="mailto:contact@noct-research.com" className="underline underline-offset-2">contact@noct-research.com</a>으로 연락해 주세요.
            </p>
            <button onClick={() => setDeclined(false)} className="w-full mt-6 py-4 rounded-2xl bg-primary text-primary-foreground font-semibold">다시 생각해볼게요</button>
            <button onClick={() => signOut({ redirectUrl: "/sign-in" })} className="w-full mt-2 py-3 text-[14px] text-muted-foreground">로그아웃</button>
          </>
        ) : (
          <>
            <h2 className="text-[20px] font-bold tracking-[-0.4px]">건강 정보 수집·이용 동의</h2>
            <p className="text-[14px] text-muted-foreground mt-2 leading-relaxed">
              수면 코칭을 위해 건강 정보를 받고 있어요. 계속 이용하려면 아래 내용을 확인하고 동의해 주세요.
            </p>
            <div className="mt-5 rounded-2xl bg-muted/60 p-4">
              <HealthConsentNotice />
            </div>
            <label className="flex items-center gap-2.5 mt-5 text-[14px] cursor-pointer select-none">
              <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} className="w-[18px] h-[18px] accent-primary" />
              <span><span className="text-muted-foreground">[필수]</span> 건강 정보 수집·이용에 동의합니다</span>
            </label>
            <button onClick={agree} disabled={!checked || saving} className="w-full mt-5 py-4 rounded-2xl bg-primary text-primary-foreground font-semibold disabled:opacity-50">
              {saving ? "저장 중…" : "동의하고 계속하기"}
            </button>
            <button onClick={() => setDeclined(true)} className="w-full mt-2 py-3 text-[14px] text-muted-foreground">동의하지 않음</button>
          </>
        )}
      </div>
    </div>
  );
}
