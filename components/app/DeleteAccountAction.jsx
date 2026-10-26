"use client";
// 내정보 탭의 회원 탈퇴 액션 (선수 전용). 확인 시트에서 "탈퇴" 입력 → /api/account/delete → 로그아웃.
import { useState } from "react";
import { UserX } from "lucide-react";
import { useClerk } from "@clerk/nextjs";
import { Row } from "./primitives";

const DELETED = [
  "WHOOP 연결과 받아온 수면·회복 기록",
  "수면일지·루틴 기록",
  "설문 답변, 세션 노트·녹음, 일정, 리포트",
  "코칭 준비자료와 올린 파일",
  "회원 정보와 로그인 계정",
];

export default function DeleteAccountAction() {
  const { signOut } = useClerk();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function close() {
    if (busy) return;
    setOpen(false);
    setText("");
    setError("");
  }

  async function submit() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: text.trim() }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d.ok) throw new Error(d.message || "탈퇴 처리 중 문제가 생겼어요.");
      await signOut({ redirectUrl: "/sign-in" }).catch(() => { window.location.href = "/sign-in"; });
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  }

  return (
    <>
      <Row icon={UserX} title="회원 탈퇴" onClick={() => setOpen(true)} />
      {open ? (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center" onClick={close}>
          <div onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[430px] max-h-[90dvh] overflow-y-auto bg-background text-foreground rounded-t-3xl sm:rounded-3xl px-6 pt-7 pb-[calc(env(safe-area-inset-bottom)+24px)]">
            <h2 className="text-[20px] font-bold tracking-[-0.4px]">정말 탈퇴할까요?</h2>
            <p className="text-[14px] text-muted-foreground mt-2 leading-relaxed">
              탈퇴하면 아래 정보가 <b className="text-foreground">바로 삭제되고 되돌릴 수 없어요.</b>
            </p>
            <ul className="mt-4 rounded-2xl bg-muted/60 p-4 space-y-1.5 text-[14px] list-disc pl-8">
              {DELETED.map((t) => <li key={t}>{t}</li>)}
            </ul>
            <p className="text-[13px] text-muted-foreground mt-3 leading-relaxed">
              법령에 따라 보관해야 하는 정보는 정해진 기간 동안 보관한 뒤 삭제해요.
            </p>
            <label className="block mt-5 text-[14px] font-semibold">
              계속하려면 <span className="text-destructive">탈퇴</span>라고 입력해 주세요
              <input value={text} onChange={(e) => setText(e.target.value)} disabled={busy} placeholder="탈퇴"
                className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-base font-normal outline-none focus:border-primary" />
            </label>
            {error ? <p className="text-[13px] text-destructive mt-2">{error}</p> : null}
            <button onClick={submit} disabled={text.trim() !== "탈퇴" || busy}
              className="w-full mt-5 py-4 rounded-2xl bg-destructive text-destructive-foreground font-semibold disabled:opacity-50">
              {busy ? "삭제 중…" : "탈퇴하기"}
            </button>
            <button onClick={close} disabled={busy} className="w-full mt-2 py-3 text-[14px] text-muted-foreground">취소</button>
          </div>
        </div>
      ) : null}
    </>
  );
}
