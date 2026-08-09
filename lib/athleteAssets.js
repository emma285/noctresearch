// 선수별 자료 자동 연결 레지스트리.
// 코치가 URL을 직접 넣지 않아도, 이름/이메일로 매칭해 리포트·데이터·세션 가이드를 연결한다.
// (선수 metadata에 reportUrl/guideUrl/dataUrl 이 있으면 그게 우선)

const REGISTRY = [
  {
    key: "yuna",
    match: (a) =>
      (a?.name && a.name.includes("윤이나")) ||
      (a?.email && a.email.toLowerCase().includes("yuna")),
    report: "/report/view/yuna-report",
    data: "/coach/asset/yuna-data",
    sessions: [
      { n: 1, label: "1차 세션", guide: "/coach/asset/yuna-guide", report: "/report/view/yuna-report", ready: true },
    ],
  },
];

// 선수(a: {name,email,reportUrl,guideUrl,dataUrl})에 대해 최종 자료 세트를 계산.
// metadata 값이 있으면 우선, 없으면 레지스트리 자동 연결.
export function resolveAssets(a = {}) {
  const reg = REGISTRY.find((r) => r.match(a)) || null;
  const sessions = (reg?.sessions || []).map((s) => ({ ...s }));
  // metadata 로 등록된 리포트/가이드가 있으면 1차 세션에 반영/보강
  if ((a.reportUrl || a.guideUrl) && sessions.length === 0) {
    sessions.push({ n: 1, label: "1차 세션", guide: a.guideUrl || "", report: a.reportUrl || "", ready: !!(a.guideUrl || a.reportUrl) });
  }
  return {
    report: a.reportUrl || reg?.report || "",
    data: a.dataUrl || reg?.data || "",
    guide: a.guideUrl || sessions[0]?.guide || "",
    sessions,
    hasAny: !!(a.reportUrl || a.dataUrl || a.guideUrl || reg),
  };
}
