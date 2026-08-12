// lib/calendar.js — 선수 캘린더 이벤트 (경기·이동·훈련·프로토콜·과제·기타) + 세션 머지.
// 세션은 SESSIONS_DB에서 자동 머지(코치·세션 타입). 나머지는 이 DB(선수/코치 입력).
import { Client } from "@notionhq/client";
import { getSessionsByAthlete } from "./master.js";

const notion = new Client({ auth: process.env.NOTION_API_KEY });
export const CAL_DB_ID = process.env.NOTION_CALENDAR_DATABASE_ID || "3ba565bc034381f5b736c713e7e708c5";

const txt = (p) => (p?.rich_text || p?.title || []).map((t) => t.plain_text).join("") || "";
// 종류별 색 (calendar-design 규칙). 코치=진한, 선수=연한은 렌더에서 source로 처리.
export const TYPE_COLOR = { 세션: "#4355B0", 프로토콜: "#8E9BE8", 과제: "#c2c7d0", 경기: "#F4978E", 이동: "#7EC8E3", 훈련: "#A0B0FF", 기타: "#6b7280" };
export const ATHLETE_TYPES = ["경기", "이동", "훈련", "기타"]; // 선수가 넣을 수 있는 종류
export const COACH_TYPES = ["세션", "프로토콜", "경기", "이동", "훈련", "과제", "기타"];

function normalizeEvent(page) {
  const P = page.properties || {};
  const d = P["기간"]?.date || {};
  const start = d.start || "";
  const allDay = start ? !/T/.test(start) : true; // 시간 없으면 하루 종일
  return {
    id: page.id,
    title: txt(P["제목"]),
    type: P["종류"]?.select?.name || "기타",
    start,
    end: d.end || "",
    allDay,
    memo: txt(P["메모"]),
    isPublic: P["공개"]?.checkbox === true,
    source: P["출처"]?.select?.name || "코치",
    kind: "event",
  };
}

// 세션(SESSIONS_DB) → 이벤트 형태
function sessionToEvent(s) {
  return {
    id: `ses-${s.id}`, sessionId: s.id,
    title: s.n ? `${s.n}회차 코칭 세션` : (s.title || "코칭 세션"),
    type: "세션", start: s.date || "", end: "", allDay: s.date ? !/T/.test(s.date) : true,
    memo: "", isPublic: true, source: "코치", kind: "session",
  };
}

// 선수의 이벤트 전체 (세션 머지). forAthlete=true면 공개 이벤트 + 세션만.
export async function getAthleteEvents(masterPageId, { forAthlete = false } = {}) {
  if (!masterPageId || !process.env.NOTION_API_KEY) return [];
  try {
    const [evRes, sessions] = await Promise.all([
      notion.databases.query({
        database_id: CAL_DB_ID,
        filter: { property: "선수", relation: { contains: masterPageId } },
        page_size: 100,
      }),
      getSessionsByAthlete(masterPageId).catch(() => []),
    ]);
    let events = evRes.results.map(normalizeEvent).filter((e) => e.start);
    if (forAthlete) events = events.filter((e) => e.isPublic);
    const sessionEvents = sessions.filter((s) => s.date).map(sessionToEvent);
    return [...events, ...sessionEvents].sort((a, b) => (a.start < b.start ? -1 : 1));
  } catch (e) {
    console.error("getAthleteEvents failed:", e?.message);
    return [];
  }
}

// 이벤트 생성 (선수/코치). start/end는 "YYYY-MM-DD" 또는 "YYYY-MM-DDTHH:mm:ss+09:00".
export async function createEvent(masterPageId, { type, title, start, end, memo, isPublic = true, source = "코치" }) {
  if (!masterPageId || !start) return { ok: false, reason: "선수/날짜 필요" };
  try {
    const page = await notion.pages.create({
      parent: { database_id: CAL_DB_ID },
      properties: {
        "제목": { title: [{ text: { content: (title || type || "일정").slice(0, 200) } }] },
        "선수": { relation: [{ id: masterPageId }] },
        "종류": type ? { select: { name: type } } : { select: null },
        "기간": { date: { start, ...(end ? { end } : {}) } },
        "메모": { rich_text: memo ? [{ text: { content: String(memo).slice(0, 1900) } }] : [] },
        "공개": { checkbox: !!isPublic },
        "출처": { select: { name: source } },
      },
    });
    return { ok: true, id: page.id };
  } catch (e) {
    console.error("createEvent failed:", e?.message);
    return { ok: false, reason: e?.message };
  }
}

export async function updateEvent(id, { type, title, start, end, memo, isPublic }) {
  if (!id) return false;
  const props = {};
  if (title !== undefined) props["제목"] = { title: [{ text: { content: String(title).slice(0, 200) } }] };
  if (type !== undefined) props["종류"] = type ? { select: { name: type } } : { select: null };
  if (start !== undefined) props["기간"] = { date: start ? { start, ...(end ? { end } : {}) } : null };
  if (memo !== undefined) props["메모"] = { rich_text: memo ? [{ text: { content: String(memo).slice(0, 1900) } }] : [] };
  if (isPublic !== undefined) props["공개"] = { checkbox: !!isPublic };
  if (Object.keys(props).length === 0) return false;
  try { await notion.pages.update({ page_id: id, properties: props }); return true; }
  catch (e) { console.error("updateEvent failed:", e?.message); return false; }
}

export async function deleteEvent(id) {
  if (!id) return false;
  try { await notion.pages.update({ page_id: id, archived: true }); return true; }
  catch (e) { console.error("deleteEvent failed:", e?.message); return false; }
}

// 이벤트 1건 소유 선수 확인 (권한 체크용)
export async function getEventOwner(id) {
  try { const p = await notion.pages.retrieve({ page_id: id }); return p.properties?.["선수"]?.relation?.[0]?.id || null; }
  catch { return null; }
}
