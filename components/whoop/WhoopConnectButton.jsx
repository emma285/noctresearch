"use client";
// components/whoop/WhoopConnectButton.jsx — "WHOOP 연결하기 / 다시 연결하기" 버튼.
// WHOOP 기록 저장 동의가 없으면 동의 시트를 먼저 띄우고, 동의하면 /api/whoop/connect 로 이동. 한 번 동의하면 바로 이동.
import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { Link2, RefreshCw } from "lucide-react";
import { Row } from "../app/primitives";
import { hasWhoopConsent } from "../../lib/consent";

const ROWS = [
  ["수집 항목", "WHOOP 수면 기록(시작·종료 시각, 수면 단계별 시간, 수면 성과·효율, 호흡수 등), 회복 기록(회복 점수, 심박변이도(HRV), 안정 시 심박, 혈중 산소포화도, 피부 온도)"],
  ["이용 목적", "코치가 수면·회복 상태를 확인해 수면 코칭에 활용"],
  ["보관 기간", "연결하는 동안 보관하고, 연결을 해제해도 코칭이 끝날 때까지 보관한 뒤 삭제"],
];

// reconnect: 만료 후 "다시 연결하기" (아이콘은 서버→클라이언트로 못 넘겨서 여기서 고름)
export default function WhoopConnectButton({ reconnect = false, title, desc }) {
  const { user } = useUser();
  const [open, setOpen] = useState(false);
  const [checked, setChecked] = useState(false);
  const [saving, setSaving] = useState(false);

  function go() {
    window.location.href = "/api/whoop/connect";
  }

  async function agree() {
    setSaving(true);
    try {
      const res = await fetch("/api/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "whoop" }),
      });
      if (!res.ok) throw new Error();
      go();
    } catch {
      setSaving(false);
    }
  }

  return (
    <>
      <Row icon={reconnect ? RefreshCw : Link2} action title={title} desc={desc} onClick={() => (hasWhoopConsent(user) ? go() : setOpen(true))} />
      {open ? (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center" onClick={() => !saving && setOpen(false)}>
          <div className="w-full max-w-[430px] max-h-[90dvh] overflow-y-auto bg-background text-foreground rounded-t-3xl sm:rounded-3xl px-6 pt-7 pb-[calc(env(safe-area-inset-bottom)+24px)]" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-[20px] font-bold tracking-[-0.4px]">WHOOP 기록 저장 동의</h2>
            <p className="text-[14px] mt-2 leading-relaxed">
              <span className="font-semibold">WHOOP을 연결하려면 이 동의가 필요해요.</span>
              <span className="text-muted-foreground"> 동의를 거부할 수 있지만, 거부하면 WHOOP을 연결할 수 없어요.</span>
            </p>
            <div className="mt-5 rounded-2xl bg-muted/60 p-4 text-[13px] leading-relaxed">
              <dl className="flex flex-col gap-2.5">
                {ROWS.map(([k, v]) => (
                  <div key={k}>
                    <dt className="font-semibold">{k}</dt>
                    <dd className="opacity-75 mt-0.5">{v}</dd>
                  </div>
                ))}
              </dl>
              <p className="opacity-75 mt-3">
                자세한 내용은 <a href="/privacy" target="_blank" className="underline underline-offset-2">개인정보처리방침</a>에서 볼 수 있어요.
              </p>
            </div>
            <label className="flex items-start gap-2.5 mt-5 text-[14px] cursor-pointer select-none">
              <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} className="mt-0.5 w-[18px] h-[18px] accent-primary shrink-0" />
              <span><span className="text-muted-foreground">[필수]</span> 코칭을 위해 WHOOP 수면·회복 기록을 NOCT 서버에 저장하는 것에 동의합니다</span>
            </label>
            <button onClick={agree} disabled={!checked || saving} className="w-full mt-5 py-4 rounded-2xl bg-primary text-primary-foreground font-semibold disabled:opacity-50">
              {saving ? "이동 중…" : "동의하고 연결하기"}
            </button>
            <button onClick={() => setOpen(false)} disabled={saving} className="w-full mt-2 py-3 text-[14px] text-muted-foreground">취소</button>
          </div>
        </div>
      ) : null}
    </>
  );
}
