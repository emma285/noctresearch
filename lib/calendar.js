// lib/calendar.js — 선수 캘린더 이벤트 (Neon calendar_events) + 세션 머지(Neon getSessionsByAthlete).
// 이벤트는 date-only(하루 종일). 세션은 회차/날짜로 머지.
import { eq } from "drizzle-orm";
import { db, schema } from "./db/index.js";
import { getSessionsByAthlete } from "./master.js";

const { calendarEvents } = schema;
export const CAL_DB_ID = process.env.NOTION_CALENDAR_DATABASE_ID || "3ba565bc034381f5b736c713e7e708c5";

// 종류별 색 (calendar-design 규칙). 코치=진한, 선수=연한은 렌더에서 source로.
export const TYPE_COLOR = { 세션: "#4355B0", 프로토콜: "#8E9BE8", 과제: "#c2c7d0", 경기: "#F4978E", 이동: "#7EC8E3", 훈련: "#A0B0FF", 기타: "#6b7280" };
export const ATHLETE_TYPES = ["경기", "이동", "훈련", "기타"]; // 선수가 넣을 수 있는 종류
export const COACH_TYPES = ["세션", "프로토콜", "경기", "이동", "훈련", "과제", "기타"];

const day10 = (s) => (s ? String(s).slice(0, 10) : "");

function normalizeEvent(row) {
  return {
    id: row.id,
    title: row.title || "",
    type: row.type || "기타",
    start: day10(row.startDate),
    end: day10(row.endDate),
    allDay: true,
    memo: row.memo || "",
    isPublic: !!row.isPublic,
    source: row.source || "코치",
    kind: "event",
  };
}

// 세션 → 이벤트 형태
function sessionToEvent(s) {
  return {
    id: `ses-${s.id}`, sessionId: s.id,
    title: s.n ? `${s.n}회차 코칭 세션` : (s.title || "코칭 세션"),
    type: "세션", start: day10(s.date), end: "", allDay: s.date ? !/T/.test(s.date) : true,
    memo: "", isPublic: true, source: "코치", kind: "session",
  };
}

// 선수의 이벤트 전체 (세션 머지). forAthlete=true면 공개 이벤트 + 세션만.
export async function getAthleteEvents(masterPageId, { forAthlete = false } = {}) {
  if (!masterPageId) return [];
  try {
    const [rows, sessions] = await Promise.all([
      db.select().from(calendarEvents).where(eq(calendarEvents.clientId, masterPageId)),
      getSessionsByAthlete(masterPageId).catch(() => []),
    ]);
    let events = rows.map(normalizeEvent).filter((e) => e.start);
    if (forAthlete) events = events.filter((e) => e.isPublic);
    const sessionEvents = sessions.filter((s) => s.date).map(sessionToEvent);
    return [...events, ...sessionEvents].sort((a, b) => (a.start < b.start ? -1 : 1));
  } catch (e) {
    console.error("getAthleteEvents failed:", e?.message);
    return [];
  }
}

// 이벤트 생성 (선수/코치).
export async function createEvent(masterPageId, { type, title, start, end, memo, isPublic = true, source = "코치" }) {
  if (!masterPageId || !start) return { ok: false, reason: "선수/날짜 필요" };
  try {
    const [row] = await db.insert(calendarEvents).values({
      clientId: masterPageId,
      type: type || null,
      title: (title || type || "일정").slice(0, 200),
      startDate: day10(start),
      endDate: end ? day10(end) : null,
      memo: memo ? String(memo).slice(0, 1900) : null,
      isPublic: !!isPublic,
      source,
    }).returning({ id: calendarEvents.id });
    return { ok: true, id: row.id };
  } catch (e) {
    console.error("createEvent failed:", e?.message);
    return { ok: false, reason: e?.message };
  }
}

export async function updateEvent(id, { type, title, start, end, memo, isPublic }) {
  if (!id) return false;
  const set = {};
  if (title !== undefined) set.title = String(title).slice(0, 200);
  if (type !== undefined) set.type = type || null;
  if (start !== undefined) { set.startDate = start ? day10(start) : null; set.endDate = end ? day10(end) : null; }
  if (memo !== undefined) set.memo = memo ? String(memo).slice(0, 1900) : null;
  if (isPublic !== undefined) set.isPublic = !!isPublic;
  if (Object.keys(set).length === 0) return false;
  try { await db.update(calendarEvents).set(set).where(eq(calendarEvents.id, id)); return true; }
  catch (e) { console.error("updateEvent failed:", e?.message); return false; }
}

export async function deleteEvent(id) {
  if (!id) return false;
  try { await db.delete(calendarEvents).where(eq(calendarEvents.id, id)); return true; }
  catch (e) { console.error("deleteEvent failed:", e?.message); return false; }
}

// 이벤트 1건 소유 선수(clients.id) — 권한 체크용
export async function getEventOwner(id) {
  try {
    const r = await db.select({ c: calendarEvents.clientId }).from(calendarEvents).where(eq(calendarEvents.id, id)).limit(1);
    return r[0]?.c || null;
  } catch { return null; }
}
