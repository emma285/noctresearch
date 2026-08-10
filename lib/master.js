// lib/master.js
// "코칭 클라이언트 (마스터)" DB = 앱의 단일 소스(single source of truth).
// 로그인 이메일로 마스터 행을 읽어 상태·다음세션·종목·티어·주차·relation을 반환한다.
// A단계(읽기 전용): 여기서는 조회만. 쓰기(상태 전이 등)는 D단계에서.
import { Client } from "@notionhq/client";

const notion = new Client({ auth: process.env.NOTION_API_KEY });

// db `2aed85ca...` · ds `collection://3e2e16f3-...` · 매칭 키 = `이메일`
export const MASTER_DB_ID =
  process.env.NOTION_MASTER_DATABASE_ID || "2aed85ca21de485f812b6e4ccfc5ffce";

// ---- Notion 속성 파서 (마스터 실제 스키마 기준) ----
const txt = (p) => (p?.rich_text || p?.title || []).map((t) => t.plain_text).join("") || "";
const sel = (p) => p?.select?.name || "";
const dt = (p) => p?.date?.start || "";
const num = (p) => (typeof p?.number === "number" ? p.number : null);
const rel = (p) => (p?.relation || []).map((r) => r.id);

// 마스터 페이지 → 앱이 쓰는 정규화 객체
export function normalizeMasterRow(page) {
  if (!page) return null;
  const P = page.properties || {};
  return {
    pageId: page.id,
    email: P["이메일"]?.email || "",
    name: txt(P["이름"]),
    status: sel(P["상태"]),            // 초대됨|로그인|intake제출|리포트게시|온보딩완료|진행중|종료
    sport: sel(P["종목"]),
    tier: sel(P["티어"]),
    startDate: dt(P["시작일"]),
    nextSession: dt(P["다음 세션"]),   // 포털 여정 날짜 소스(하드코딩 대체)
    week: num(P["코칭 주차"]),
    clerkUserId: txt(P["Clerk 유저ID"]),
    dashboardToken: txt(P["대시보드 토큰"]),
    phone: P["연락처"]?.phone_number || "",
    // 공개된 리포트 slug 목록 (공백/쉼표 구분 텍스트) — 리포트 아카이브 오픈 게이트
    publishedReports: txt(P["공개 리포트"]).split(/[\s,]+/).map((s) => s.trim()).filter(Boolean),
    relations: {
      intake: rel(P["Intake"]),
      weekly: rel(P["주간 데이터"]),
      sessions: rel(P["코칭 세션"]),
      interventions: rel(P["인터벤션"]),
      prep: rel(P["준비 자료"]),
      records: rel(P["선수 기록"]),
    },
  };
}

// 전체 선수(마스터 행) 목록 — 코치 콘솔용.
export async function getAllAthletes() {
  if (!process.env.NOTION_API_KEY) return [];
  try {
    const res = await notion.databases.query({ database_id: MASTER_DB_ID, page_size: 100 });
    return res.results.map(normalizeMasterRow).filter(Boolean);
  } catch (e) {
    console.error("getAllAthletes failed:", e?.message);
    return [];
  }
}

// 마스터 행의 `공개 리포트`(slug 목록 텍스트) 갱신. 코치가 리포트 공개 토글 시 호출.
export async function setPublishedReports(pageId, slugs) {
  if (!pageId || !process.env.NOTION_API_KEY) return false;
  const text = (Array.isArray(slugs) ? slugs : []).map(String).filter(Boolean).join(" ");
  try {
    await notion.pages.update({
      page_id: pageId,
      properties: { "공개 리포트": { rich_text: text ? [{ text: { content: text.slice(0, 1900) } }] : [] } },
    });
    return true;
  } catch (e) {
    console.error("setPublishedReports failed:", e?.message);
    return false;
  }
}

// 이메일로 마스터 행 1건 조회 (없으면 null). 대소문자 차이 대비 fallback 포함.
export async function getAthleteByEmail(email) {
  if (!email || !process.env.NOTION_API_KEY) return null;
  const key = String(email).trim();
  try {
    // 1차: 정확 일치
    let res = await notion.databases.query({
      database_id: MASTER_DB_ID,
      filter: { property: "이메일", email: { equals: key } },
      page_size: 1,
    });
    if (!res.results.length && key !== key.toLowerCase()) {
      // 2차: 소문자로 재시도(입력 케이스 차이 방어)
      res = await notion.databases.query({
        database_id: MASTER_DB_ID,
        filter: { property: "이메일", email: { equals: key.toLowerCase() } },
        page_size: 1,
      });
    }
    return normalizeMasterRow(res.results[0] || null);
  } catch (e) {
    // 통합 미연결/네트워크 등은 앱을 죽이지 않고 null (호출부가 기존 경로로 폴백)
    console.error("getAthleteByEmail failed:", e?.message);
    return null;
  }
}

// 코칭 세션 DB (349e906e...) — 부모 허브가 noct에 연결돼 있어야 조회됨.
const SESSIONS_DB_ID = process.env.NOTION_SESSIONS_DATABASE_ID || "349e906e42e94e1592679d390fbe2916";

// 세션 1건 조회 (코칭 노트 페이지용). { n, date, topics[], title }
export async function getSessionById(id) {
  if (!id || !process.env.NOTION_API_KEY) return null;
  try {
    const p = await notion.pages.retrieve({ page_id: id });
    const P = p.properties || {};
    const rt = (k) => (P[k]?.rich_text || []).map((t) => t.plain_text).join("");
    return {
      id: p.id,
      n: typeof P["회차"]?.number === "number" ? P["회차"].number : null,
      date: P["일시"]?.date?.start || "",
      topics: (P["다룬 토픽"]?.multi_select || []).map((t) => t.name),
      title: (P["세션"]?.title || []).map((t) => t.plain_text).join(""),
      // 코칭 노트 (선수 공유용)
      summary: rt("세션 요약"),
      actions: rt("실천 항목").split("\n").map((x) => x.trim()).filter(Boolean),
      comment: rt("코치 코멘트"),
      published: P["노트 공개"]?.checkbox === true,
    };
  } catch (e) {
    console.error("getSessionById failed:", e?.message);
    return null;
  }
}

// 선수(마스터 pageId)의 지난 세션 목록. 회차 내림차순 [{회차, date, title}]. 실패 시 [].
export async function getSessionsByAthlete(masterPageId) {
  if (!masterPageId || !process.env.NOTION_API_KEY) return [];
  try {
    const res = await notion.databases.query({
      database_id: SESSIONS_DB_ID,
      filter: { property: "선수", relation: { contains: masterPageId } },
      sorts: [{ property: "회차", direction: "descending" }],
      page_size: 20,
    });
    return res.results.map((p) => {
      const P = p.properties || {};
      return {
        id: p.id,
        n: typeof P["회차"]?.number === "number" ? P["회차"].number : null,
        date: P["일시"]?.date?.start || "",
        title: (P["세션"]?.title || []).map((t) => t.plain_text).join(""),
      };
    });
  } catch (e) {
    console.error("getSessionsByAthlete failed:", e?.message);
    return [];
  }
}
