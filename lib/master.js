// lib/master.js
// 앱의 단일 소스 = Neon `clients` 테이블 (구 Notion 마스터 이전, 2026-08-13).
// clients 관련(조회·쓰기·upsert)은 Neon. 세션(getSessionById/getSessionsByAthlete)은 아직 Notion(다음 슬라이스).
import { and, eq, desc, sql as dsql } from "drizzle-orm";
import { db, schema } from "./db/index.js";

const { clients, sessions, intakeResponses } = schema;
export const MASTER_DB_ID = process.env.NOTION_MASTER_DATABASE_ID || "2aed85ca21de485f812b6e4ccfc5ffce";

// Neon Date(timestamptz) → KST 벽시계 ISO("...T10:00:00+09:00"). 코치폼 정규식/포털 파싱 호환.
function toKstIso(d) {
  if (!d) return "";
  const t = d instanceof Date ? d : new Date(d);
  if (isNaN(t)) return "";
  const k = new Date(t.getTime() + 9 * 3600 * 1000);
  const p = (n) => String(n).padStart(2, "0");
  return `${k.getUTCFullYear()}-${p(k.getUTCMonth() + 1)}-${p(k.getUTCDate())}T${p(k.getUTCHours())}:${p(k.getUTCMinutes())}:00+09:00`;
}

// Neon clients 행 → 앱이 쓰는 정규화 객체 (구 normalizeMasterRow와 동일 shape).
// relations는 전환기라 빈 배열 — 포털은 status로 파생(ongoing 등), 세션 목록은 getSessionsByAthlete가 별도 제공.
export function normalizeClientRow(row) {
  if (!row) return null;
  const prof = row.profile || {};
  return {
    pageId: row.id,
    email: row.email || "",
    name: row.name || "",
    status: row.status || "",
    sport: prof.sport || "",
    tier: row.tier || "",
    program: row.program || "",
    startDate: prof.startDate || "",
    nextSession: toKstIso(row.nextSession),
    week: row.week ?? null,
    clerkUserId: row.clerkUserId || "",
    dashboardToken: prof.dashboardToken || "",
    phone: prof.phone || "",
    publishedReports: Array.isArray(prof.publishedReports) ? prof.publishedReports : [],
    relations: { intake: [], weekly: [], sessions: [], interventions: [], prep: [], records: [] },
  };
}
// 구 이름 호환
export const normalizeMasterRow = normalizeClientRow;

// 이메일로 클라이언트 1건 (대소문자 무시). 없으면 null.
export async function getAthleteByEmail(email) {
  const key = String(email || "").trim();
  if (!key) return null;
  try {
    const rows = await db.select().from(clients).where(dsql`lower(${clients.email}) = ${key.toLowerCase()}`).limit(1);
    return normalizeClientRow(rows[0] || null);
  } catch (e) {
    console.error("getAthleteByEmail failed:", e?.message);
    return null;
  }
}

// pageId(clients.id UUID)로 클라이언트 1건 — 코치 URL에서 이메일 대신 쓰는 불투명 id.
export async function getAthleteById(id) {
  const key = String(id || "").trim();
  if (!key) return null;
  try {
    const rows = await db.select().from(clients).where(eq(clients.id, key)).limit(1);
    return normalizeClientRow(rows[0] || null);
  } catch (e) {
    console.error("getAthleteById failed:", e?.message);
    return null;
  }
}

// 이메일(@ 포함) 또는 pageId 어느 쪽이든 해석 — ?as= 미리보기 하위호환.
export async function getAthleteByRef(ref) {
  const key = String(ref || "").trim();
  if (!key) return null;
  return key.includes("@") ? getAthleteByEmail(key) : getAthleteById(key);
}

// 전체 클라이언트 목록 — 코치 콘솔용.
export async function getAllAthletes() {
  try {
    const rows = await db.select().from(clients);
    return rows.map(normalizeClientRow).filter(Boolean);
  } catch (e) {
    console.error("getAllAthletes failed:", e?.message);
    return [];
  }
}

// 코치가 마스터에 직접 쓰기 (전달된 필드만 부분 업데이트).
export async function updateMasterFields(pageId, fields = {}) {
  if (!pageId) return false;
  const set = {};
  if (fields.nextSession !== undefined) set.nextSession = fields.nextSession ? new Date(fields.nextSession) : null;
  if (fields.status !== undefined) set.status = fields.status || null;
  if (fields.week !== undefined) set.week = (fields.week === "" || fields.week == null) ? null : Number(fields.week);
  if (fields.program !== undefined) set.program = fields.program || null;
  if (fields.tier !== undefined) set.tier = fields.tier || null;
  if (fields.sport !== undefined)
    set.profile = dsql`jsonb_set(coalesce(${clients.profile}, '{}'::jsonb), '{sport}', ${JSON.stringify(fields.sport || null)}::jsonb)`;
  if (Object.keys(set).length === 0) return false;
  set.updatedAt = new Date();
  try {
    await db.update(clients).set(set).where(eq(clients.id, pageId));
    return true;
  } catch (e) {
    console.error("updateMasterFields failed:", e?.message);
    return false;
  }
}

// 리포트 공개 slug 목록 갱신 (profile.publishedReports).
export async function setPublishedReports(pageId, slugs) {
  if (!pageId) return false;
  const arr = (Array.isArray(slugs) ? slugs : []).map(String).filter(Boolean);
  try {
    await db.update(clients)
      .set({ profile: dsql`jsonb_set(coalesce(${clients.profile}, '{}'::jsonb), '{publishedReports}', ${JSON.stringify(arr)}::jsonb)`, updatedAt: new Date() })
      .where(eq(clients.id, pageId));
    return true;
  } catch (e) {
    console.error("setPublishedReports failed:", e?.message);
    return false;
  }
}

// 가입 시 clients 행 자동 생성/보강(upsert). 이메일이 매칭 키.
export async function upsertAthleteFromSignup({ email, name = "", clerkUserId = "" } = {}) {
  const key = String(email || "").trim();
  if (!key) return { ok: false, created: false, reason: "no-email" };
  try {
    const existing = await getAthleteByEmail(key);
    if (existing) {
      const set = {};
      if (name && !existing.name) set.name = name.slice(0, 200);
      if (clerkUserId && !existing.clerkUserId) set.clerkUserId = clerkUserId.slice(0, 200);
      if (existing.status === "초대됨" || !existing.status) set.status = "로그인";
      if (Object.keys(set).length === 0) return { ok: true, created: false, updated: false, pageId: existing.pageId };
      set.updatedAt = new Date();
      await db.update(clients).set(set).where(eq(clients.id, existing.pageId));
      return { ok: true, created: false, updated: true, pageId: existing.pageId };
    }
    const [row] = await db.insert(clients)
      .values({ email: key, name: (name || key).slice(0, 200), type: "athlete", status: "로그인", clerkUserId: clerkUserId ? clerkUserId.slice(0, 200) : null })
      .returning({ id: clients.id });
    return { ok: true, created: true, updated: false, pageId: row.id };
  } catch (e) {
    console.error("upsertAthleteFromSignup failed:", e?.message);
    return { ok: false, created: false, reason: e?.message };
  }
}

// ───────────────── 세션 (Neon) ─────────────────
export async function getSessionById(id) {
  if (!id) return null;
  try {
    const s = (await db.select().from(sessions).where(eq(sessions.id, id)).limit(1))[0];
    if (!s) return null;
    return {
      id: s.id,
      clientId: s.clientId,
      n: s.n,
      date: toKstIso(s.sessionAt),
      topics: Array.isArray(s.topics) ? s.topics : [],
      title: s.title || "",
      summary: s.summary || "",
      actions: String(s.actionItems || "").split("\n").map((x) => x.trim()).filter(Boolean),
      comment: s.coachComment || "",
      published: !!s.published,
      detail: s.detail || {},
      guide: s.guide || {},
      attachments: Array.isArray(s.detail?.attachments) ? s.detail.attachments : [],
      audioUrl: s.audioUrl || "",
      transcript: s.transcript || "",
    };
  } catch (e) { console.error("getSessionById failed:", e?.message); return null; }
}

// 선수에게 노출된 부가자료 slug 목록 = 공개(published)된 세션들에 첨부된 자료 합집합.
export async function getExposedAssetSlugs(clientId) {
  if (!clientId) return [];
  try {
    const rows = await db.select({ detail: sessions.detail }).from(sessions)
      .where(and(eq(sessions.clientId, clientId), eq(sessions.published, true)));
    const set = new Set();
    for (const r of rows) {
      const a = r.detail?.attachments;
      if (Array.isArray(a)) a.forEach((x) => x && set.add(String(x)));
    }
    return [...set];
  } catch (e) { console.error("getExposedAssetSlugs failed:", e?.message); return []; }
}

// 코치 대시보드 우측 '오늘 할 일'
// upcoming = 마스터 nextSession이 7일 내인 선수(테이블 '다음 세션'과 동일 소스)
// pending  = 노트 작성됐고(chief) 아직 미공개인 세션(코치 검토 대기)
export async function getCoachOverview() {
  try {
    const [clientRows, latest, sessRows] = await Promise.all([
      db.select({ id: clients.id, name: clients.name, email: clients.email, nextSession: clients.nextSession }).from(clients),
      getLatestSessionByClient(),
      db.select({ id: sessions.id, n: sessions.n, published: sessions.published, detail: sessions.detail, clientName: clients.name }).from(sessions).leftJoin(clients, eq(sessions.clientId, clients.id)),
    ]);
    const now = Date.now(), weekEnd = now + 7 * 86400000;
    const upcoming = clientRows
      .filter((c) => c.nextSession && new Date(c.nextSession).getTime() >= now - 12 * 3600000 && new Date(c.nextSession).getTime() <= weekEnd)
      .sort((a, b) => new Date(a.nextSession) - new Date(b.nextSession))
      .map((c) => ({ id: latest[c.id] || "", pageId: c.id, email: c.email || "", name: c.name || c.email || "선수", at: toKstIso(c.nextSession) }));
    const pending = sessRows
      .filter((r) => !r.published && r.detail?.chief)
      .map((r) => ({ id: r.id, n: r.n, name: r.clientName || "선수" }));
    return { upcoming, pending, weekCount: upcoming.length, pendingCount: pending.length };
  } catch (e) { console.error("getCoachOverview failed:", e?.message); return { upcoming: [], pending: [], weekCount: 0, pendingCount: 0 }; }
}

// 전체 세션(선수명 포함) — 코치 '세션' 페이지용. 최근/예정 순.
export async function getAllSessionsForCoach() {
  try {
    const rows = await db.select({
      id: sessions.id, n: sessions.n, sessionAt: sessions.sessionAt, published: sessions.published,
      detail: sessions.detail, guide: sessions.guide, clientName: clients.name, email: clients.email,
    }).from(sessions).leftJoin(clients, eq(sessions.clientId, clients.id)).orderBy(desc(sessions.sessionAt));
    return rows.map((r) => ({
      id: r.id, n: r.n, name: r.clientName || r.email || "선수", email: r.email || "",
      date: toKstIso(r.sessionAt),
      published: !!r.published, hasNote: !!(r.detail && r.detail.chief), hasGuide: !!(r.guide && (r.guide.goal || r.guide.review)),
    }));
  } catch (e) { console.error("getAllSessionsForCoach failed:", e?.message); return []; }
}

// 선수별 최신(최고 회차) 세션 id 맵 { clientId: sessionId } — 대시보드 '세션 가이드' 바로가기용.
export async function getLatestSessionByClient() {
  try {
    const rows = await db.select({ clientId: sessions.clientId, id: sessions.id }).from(sessions).orderBy(desc(sessions.n));
    const map = {};
    for (const r of rows) if (r.clientId && !(r.clientId in map)) map[r.clientId] = r.id; // desc(n) → 첫 등장 = 최고 회차
    return map;
  } catch (e) { console.error("getLatestSessionByClient failed:", e?.message); return {}; }
}

// 선수별 '아직 안 끝난' 최신 세션 id — 가이드 준비 대상. 최고 회차가 이미 노트있음/공개면 없음(빈값).
export async function getNextGuideSessionByClient() {
  try {
    const rows = await db.select({ clientId: sessions.clientId, id: sessions.id, published: sessions.published, detail: sessions.detail }).from(sessions).orderBy(desc(sessions.n));
    const seen = new Set(), map = {};
    for (const r of rows) {
      if (!r.clientId || seen.has(r.clientId)) continue;
      seen.add(r.clientId); // 첫 등장 = 최고 회차
      const done = r.published || !!(r.detail && r.detail.chief);
      if (!done) map[r.clientId] = r.id;
    }
    return map;
  } catch (e) { console.error("getNextGuideSessionByClient failed:", e?.message); return {}; }
}

// 선수(clients.id)의 지난 세션. 회차 내림차순 [{id, n, date, title}].
export async function getSessionsByAthlete(masterPageId) {
  if (!masterPageId) return [];
  try {
    const rows = await db.select().from(sessions).where(eq(sessions.clientId, masterPageId)).orderBy(desc(sessions.n));
    return rows.map((s) => {
      // NEW = 공개됐고(publishedAt) 선수가 그 이후로 아직 안 봄(seenAt 없거나 이전)
      const isNew = !!s.published && !!s.publishedAt && (!s.seenAt || new Date(s.seenAt) < new Date(s.publishedAt));
      return { id: s.id, n: s.n, date: toKstIso(s.sessionAt), title: s.title || "", published: !!s.published, isNew, hasNote: !!(s.detail && s.detail.chief), hasGuide: !!(s.guide && (s.guide.goal || s.guide.review)) };
    });
  } catch (e) { console.error("getSessionsByAthlete failed:", e?.message); return []; }
}

// 선수가 노트를 봤음 → seen_at 갱신(홈 NEW 해제). 코치 프리뷰에선 호출 X.
export async function markSessionSeen(id) {
  if (!id) return;
  try { await db.update(sessions).set({ seenAt: new Date() }).where(eq(sessions.id, id)); }
  catch (e) { console.error("markSessionSeen failed:", e?.message); }
}

// 세션 노트 부분 업데이트 + 공개 전환(false→true) 시 다음 회차 자동 생성.
export async function updateSessionNote(id, patch = {}) {
  if (!id) return { ok: false };
  try {
    const cur = (await db.select().from(sessions).where(eq(sessions.id, id)).limit(1))[0];
    if (!cur) return { ok: false, reason: "no-session" };
    const set = {};
    if (patch.summary !== undefined) set.summary = patch.summary || null;
    if (patch.actions !== undefined) set.actionItems = Array.isArray(patch.actions) ? patch.actions.map((a) => String(a).trim()).filter(Boolean).join("\n") : String(patch.actions || "");
    if (patch.comment !== undefined) set.coachComment = patch.comment || null;
    if (patch.published !== undefined) {
      set.published = !!patch.published;
      if (patch.published === true && !cur.published) set.publishedAt = new Date(); // 공개 전환 시각 → 선수 홈 NEW
    }
    if (patch.detail !== undefined) set.detail = typeof patch.detail === "string" ? (() => { try { return JSON.parse(patch.detail); } catch { return { memo: patch.detail }; } })() : patch.detail;
    if (patch.audioUrl !== undefined) set.audioUrl = patch.audioUrl || null;
    if (patch.transcript !== undefined) set.transcript = patch.transcript || null;
    if (Object.keys(set).length === 0) return { ok: false, reason: "empty" };
    await db.update(sessions).set(set).where(eq(sessions.id, id));

    let createdNext = false;
    if (patch.published === true && !cur.published) createdNext = await createNextSession({ ...cur, ...set });
    return { ok: true, createdNext };
  } catch (e) { console.error("updateSessionNote failed:", e?.message); return { ok: false, reason: e?.message }; }
}

// 다음 회차 세션 자동 생성 (idempotent). 날짜=상세노트 detail.nextSessionDate(전사서 캐치, 프로세서가 채움), 없으면 미정.
async function createNextSession(session) {
  const nextN = (session.n || 0) + 1;
  const dup = await db.select({ id: sessions.id }).from(sessions).where(and(eq(sessions.clientId, session.clientId), eq(sessions.n, nextN)));
  if (dup.length) return false;
  const iso = session.detail?.nextSessionDate || null;
  await db.insert(sessions).values({ clientId: session.clientId, n: nextN, sessionAt: iso ? new Date(iso) : null, published: false });
  // 다음 세션 날짜가 잡혔으면 마스터 '다음 세션'도 갱신(대시보드·포털 일관성)
  if (iso) { try { await db.update(clients).set({ nextSession: new Date(iso), updatedAt: new Date() }).where(eq(clients.id, session.clientId)); } catch (e) { console.error("createNextSession master sync failed:", e?.message); } }
  return true;
}

// 설문 답변 Neon 저장 (제출 시 dual-write). answers=원본 data 객체(JSONB).
export async function saveIntakeResponse(clientId, type, answers) {
  if (!clientId) return null;
  try {
    const [row] = await db.insert(intakeResponses)
      .values({ clientId, type: type || "athlete", answers: answers || {} })
      .returning({ id: intakeResponses.id });
    return row.id;
  } catch (e) { console.error("saveIntakeResponse failed:", e?.message); return null; }
}

// 새 세션 생성 (intake 제출 → 1차 등). idempotent by (clientId, n).
export async function createSession(clientId, { n = 1, sessionAt = null, title = null } = {}) {
  if (!clientId) return null;
  const dup = await db.select({ id: sessions.id }).from(sessions).where(and(eq(sessions.clientId, clientId), eq(sessions.n, n)));
  if (dup.length) return dup[0].id;
  const [row] = await db.insert(sessions).values({ clientId, n, sessionAt: sessionAt ? new Date(sessionAt) : null, title, published: false }).returning({ id: sessions.id });
  return row.id;
}
