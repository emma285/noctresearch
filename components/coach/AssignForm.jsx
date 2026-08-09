"use client";

// 코치 배정 폼 — 첫 세션 날짜 + 세션 라벨(선택) + 프로그램(주)을 선수 metadata에 저장.
import { useState } from "react";
import { useRouter } from "next/navigation";

const DOW = ["일", "월", "화", "수", "목", "금", "토"];

// "2026-08-09" → "8월 9일(일)" (라벨 자동 제안용, UTC 파싱)
function labelFromDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
  if (!m) return "";
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return `${+m[2]}월 ${+m[3]}일(${DOW[d.getUTCDay()]}) · 오전 10시`;
}

export default function AssignForm({ target }) {
  const router = useRouter();
  const [firstSessionAt, setFirstSessionAt] = useState(target.firstSessionAt || "");
  const [sessionLabel, setSessionLabel] = useState(target.sessionLabel || "");
  const [programWeeks, setProgramWeeks] = useState(target.programWeeks || "");
  const [reportUrl, setReportUrl] = useState(target.reportUrl || "");
  const [guideUrl, setGuideUrl] = useState(target.guideUrl || "");
  const [dataUrl, setDataUrl] = useState(target.dataUrl || "");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(""); // "" | "ok" | error message

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setStatus("");
    try {
      const res = await fetch("/api/coach/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid: target.uid,
          firstSessionAt,
          sessionLabel: sessionLabel || labelFromDate(firstSessionAt),
          programWeeks,
          reportUrl,
          guideUrl,
          dataUrl,
        }),
      });
      const j = await res.json();
      if (j.success) {
        setStatus("ok");
        setTimeout(() => { router.push("/portal"); router.refresh(); }, 1000);
      } else {
        setStatus(j.message || "저장 실패");
      }
    } catch {
      setStatus("네트워크 오류");
    }
    setLoading(false);
  }

  const field = "w-full bg-white border-2 border-gray-200 focus:border-blue-400 text-gray-900 py-3 px-4 rounded-xl outline-none transition-colors text-base";
  const label = "text-sm font-semibold text-gray-500 mb-1.5 block";

  return (
    <main className="min-h-screen bg-[#F2F3F6] flex items-start justify-center px-6 py-16" style={{ fontFamily: "'Pretendard',sans-serif" }}>
      <div className="w-full max-w-md">
        <a href="/portal" className="inline-flex items-center gap-1.5 text-sm font-bold text-blue-600 hover:underline mb-4">← 코치 대시보드</a>
        <h1 className="text-xl font-extrabold text-gray-900 mb-1">선수 정보 관리</h1>
        <p className="text-sm text-gray-500 mb-6">
          {target.name || "이름 미상"}{target.email ? ` · ${target.email}` : ""}
        </p>

        <form onSubmit={onSubmit} className="flex flex-col gap-5 bg-white rounded-2xl p-6 shadow-sm">
          <div className="text-xs font-extrabold tracking-wider text-blue-600">선수별 자료 링크</div>
          <div>
            <label className={label}>수면 리포트 URL</label>
            <input type="text" className={field} placeholder="/reports/yuna-report.html 또는 https://…"
              value={reportUrl} onChange={(e) => setReportUrl(e.target.value)} />
          </div>
          <div>
            <label className={label}>코치 가이드 URL</label>
            <input type="text" className={field} placeholder="/coach/asset/yuna-guide 또는 https://…"
              value={guideUrl} onChange={(e) => setGuideUrl(e.target.value)} />
          </div>
          <div>
            <label className={label}>선수 데이터 URL <span className="font-normal text-gray-400">(HTML 또는 노션)</span></label>
            <input type="text" className={field} placeholder="/coach/asset/yuna-data 또는 https://www.notion.so/…"
              value={dataUrl} onChange={(e) => setDataUrl(e.target.value)} />
          </div>

          <div className="text-xs font-extrabold tracking-wider text-blue-600 mt-2 pt-4 border-t border-gray-100">첫 리포트·포털에 쓸 정보</div>
          <div>
            <label className={label}>첫 코칭 세션 날짜</label>
            <input type="date" className={field} value={firstSessionAt}
              onChange={(e) => setFirstSessionAt(e.target.value)} />
          </div>
          <div>
            <label className={label}>세션 일정 표시 (선택)</label>
            <input type="text" className={field}
              placeholder={firstSessionAt ? labelFromDate(firstSessionAt) : "예: 8월 9일(일) · 오전 10시"}
              value={sessionLabel} onChange={(e) => setSessionLabel(e.target.value)} />
            <p className="text-xs text-gray-400 mt-1.5">비우면 날짜에서 자동으로 만들어요(오전 10시 기준).</p>
          </div>
          <div>
            <label className={label}>프로그램 (주)</label>
            <input type="number" min="1" max="52" className={field} placeholder="예: 8"
              value={programWeeks} onChange={(e) => setProgramWeeks(e.target.value)} />
          </div>

          <button type="submit" disabled={loading}
            className="mt-1 py-3.5 rounded-xl bg-blue-600 text-white font-bold text-base hover:bg-blue-700 transition-colors disabled:opacity-50">
            {loading ? "저장 중…" : "저장"}
          </button>

          {status === "ok" && (
            <p className="text-sm text-green-600 font-semibold text-center">
              저장했어요. 대시보드로 돌아갈게요…
            </p>
          )}
          {status && status !== "ok" && (
            <p className="text-sm text-red-500 font-semibold text-center">{status}</p>
          )}
        </form>

        <p className="text-xs text-gray-400 mt-4 text-center">비우고 저장하면 해당 항목은 '미정'으로 돌아가요.</p>
      </div>
    </main>
  );
}
