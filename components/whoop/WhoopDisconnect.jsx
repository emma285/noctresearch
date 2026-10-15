"use client";
// components/whoop/WhoopDisconnect.jsx — WHOOP 연결 해제 버튼 (확인 후 /api/whoop/disconnect).
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Unlink, Loader2 } from "lucide-react";

export default function WhoopDisconnect() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onClick() {
    if (!window.confirm("WHOOP 연결을 해제할까요?\n해제하면 이후 데이터가 더 이상 자동으로 들어오지 않아요.")) return;
    setBusy(true);
    try {
      const res = await fetch("/api/whoop/disconnect", { method: "POST" });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      window.alert("연결 해제에 실패했어요. 잠시 후 다시 시도해주세요.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button type="button" onClick={onClick} disabled={busy}
      className="w-full flex items-center gap-3 p-4 text-left active:bg-muted/40 transition-colors disabled:opacity-60">
      {busy ? <Loader2 className="w-[22px] h-[22px] text-muted-foreground animate-spin" /> : <Unlink className="w-[22px] h-[22px] text-muted-foreground" strokeWidth={2} />}
      <div className="flex-1 text-base font-semibold text-foreground">WHOOP 연결 해제</div>
    </button>
  );
}
