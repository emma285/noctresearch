// 선수별 자료 자동 연결 레지스트리.
// (선수 metadata에 reportUrl/guideUrl/dataUrl 이 있으면 그게 우선)
// 리포트는 앞으로 여러 개가 된다 → reports[] 로 관리하고, 각 리포트마다 slug 로 공개 토글이 붙는다.
// 새 리포트 추가 = 해당 선수 reports[] 에 { slug, url, label } 한 줄 추가.

const REGISTRY = [
  {
    key: "yuna",
    match: (a) =>
      (a?.name && a.name.includes("윤이나")) ||
      (a?.email && a.email.toLowerCase().includes("yuna")),
    data: "/coach/asset/yuna-data",
    reports: [
      {
        slug: "yuna-report", url: "/report/view/yuna-report", label: "1차 수면 리포트",
        date: "2026.08", badge: "1차",
        chips: ["사전 질문지 68문항", "1차 세션"],
        desc: "수면 설문지를 바탕으로 작성",
      },
    ],
    sessions: [
      { n: 1, label: "1차 세션", guide: "/coach/asset/yuna-guide", report: "/report/view/yuna-report", ready: true },
    ],
    extras: [
      { url: "/coach/asset/yuna-jetlag", label: "시차적응 타임테이블 (8/16~19)", desc: "출국까지 위상 후퇴 스케줄 · 서울 미루기 + 기내" },
      { url: "/coach/asset/yuna-jetlag2", label: "보스턴 시차적응 프로토콜 (2)", desc: "비행 ~ 도착 후 이틀 · 현지 적응" },
      { url: "/coach/asset/yuna-kpmg-review", label: "KPMG 4라운드 수면 리뷰", desc: "실제 4라운드 루틴·성적·긴장 흐름 (전사 기반 복기)" },
      { url: "/coach/asset/yuna-fm-schedule", label: "보스턴 FM 프로암~R2 타임테이블", desc: "프로암·R2 티오프별 수면·기상 설계" },
    ],
  },
  {
    key: "jisoo",
    match: (a) =>
      (a?.name && a.name.includes("이지수")) ||
      (a?.email && a.email.toLowerCase().includes("yijisoo")),
    // 오래된순(온보딩 → 4개월차)으로 둠 — reports 페이지가 reverse()해서 최신이 위로 감
    reports: [
      {
        slug: "jisoo-onboarding", url: "/report/view/jisoo-onboarding", label: "1차 수면 리포트",
        date: "2026.03", badge: "1차",
        chips: ["사전 질문지", "온보딩"],
        desc: "사전 질문지를 바탕으로 작성한 시작점 리포트",
      },
      {
        slug: "jisoo-diary", url: "/report/view/jisoo-diary", label: "4개월차 경과 리포트",
        date: "2026.06", badge: "4개월차",
        chips: ["수면일지 4개월", "11회 세션"],
        desc: "직접 남긴 일지로 본 2~6월 경과",
      },
    ],
  },
];

// "/report/view/yuna-report" · "/reports/yuna-report.html" → "yuna-report"
export function reportSlug(url) {
  if (!url) return "";
  const last = String(url).split("?")[0].split("/").pop() || "";
  return last.replace(/\.html?$/i, "");
}

// slug 목록 → 해당 extras 객체 목록 (선수 노출용). slug = extra.url 마지막 구간.
export function extrasBySlugs(extras = [], slugs = []) {
  const set = new Set((slugs || []).map(String));
  return (extras || []).filter((e) => set.has(reportSlug(e.url)));
}

// 공개된 리포트 slug 집합.
// 신규 모델: publicMetadata.publishedReports = 공개된 slug 배열.
// 하위호환: 예전 boolean reportPublished === true 면 primarySlug(첫 리포트)도 공개로 본다.
export function publishedReportSet(meta = {}, primarySlug = "") {
  const set = new Set(
    (Array.isArray(meta?.publishedReports) ? meta.publishedReports : [])
      .filter(Boolean)
      .map(String)
  );
  if (meta?.reportPublished === true && primarySlug) set.add(primarySlug);
  return set;
}

// 선수(a: {name,email,reportUrl,guideUrl,dataUrl})에 대해 최종 자료 세트를 계산.
// metadata 값이 있으면 우선, 없으면 레지스트리 자동 연결.
export function resolveAssets(a = {}) {
  const reg = REGISTRY.find((r) => r.match(a)) || null;
  const sessions = (reg?.sessions || []).map((s) => ({ ...s }));
  // metadata 로 등록된 리포트/가이드가 있으면 1차 세션에 반영/보강
  if ((a.reportUrl || a.guideUrl) && sessions.length === 0) {
    sessions.push({ n: 1, label: "1차 세션", guide: a.guideUrl || "", report: a.reportUrl || "", ready: !!(a.guideUrl || a.reportUrl) });
  }

  // 리포트 목록 — metadata 지정분을 최우선, 그다음 레지스트리 reports[]. slug 중복 제거.
  const reports = [];
  const seen = new Set();
  const push = (url, label, extra = {}) => {
    const slug = reportSlug(url);
    if (!slug || seen.has(slug)) return;
    seen.add(slug);
    // 아카이브용 메타(date·badge·chips·desc)도 함께 실어 나른다.
    reports.push({ slug, url, label: label || "수면 리포트", date: extra.date || "", badge: extra.badge || "", chips: extra.chips || [], desc: extra.desc || "" });
  };
  if (a.reportUrl) push(a.reportUrl, "수면 리포트");
  (reg?.reports || []).forEach((r) => push(r.url, r.label, r));

  return {
    report: reports[0]?.url || "", // 하위호환(단일 리포트 참조)
    reports, // 전체 리포트 목록
    data: a.dataUrl || reg?.data || "",
    guide: a.guideUrl || sessions[0]?.guide || "",
    sessions,
    extras: reg?.extras || [],
    hasAny: !!(a.reportUrl || a.dataUrl || a.guideUrl || reg),
  };
}
