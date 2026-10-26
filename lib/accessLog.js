// lib/accessLog.js — 접속 기록 저장 (/Users/jay/whoop/privacy/접속기록_정의.md).
// 기록 실패가 화면·API를 막지 않도록 예외는 삼키고 console.error만 남긴다.
import { headers } from "next/headers";
import { eq, lt, and, or, sql as dsql } from "drizzle-orm";
import { db, schema } from "./db/index.js";
import { isCoachEmail } from "./coach.js";

const { accessLogs, clients, sessions, calendarEvents, attachments } = schema;

function requestInfo() {
  try {
    const h = headers();
    const ip = (h.get("x-forwarded-for") || "").split(",")[0].trim() || h.get("x-real-ip") || null;
    return { ip, userAgent: h.get("user-agent") || null };
  } catch {
    return { ip: null, userAgent: null };
  }
}

// target: { email?, clientId?, sessionId?, eventId?, fileUrl? } — 이메일이 없으면 id로 찾아 채운다.
async function resolveTargetEmail(target = {}) {
  if (target.email) return target.email;
  let clientId = target.clientId;
  if (!clientId && target.sessionId) {
    const [s] = await db.select({ clientId: sessions.clientId }).from(sessions).where(eq(sessions.id, target.sessionId)).limit(1);
    clientId = s?.clientId;
  }
  if (!clientId && target.fileUrl) {
    // 파일 주인: 준비자료 첨부(data.files[].url) 또는 세션 녹음(sessions.audio_url)
    const [a] = await db.select({ email: attachments.userEmail }).from(attachments)
      .where(dsql`${attachments.data}->'files' @> ${JSON.stringify([{ url: target.fileUrl }])}::jsonb`).limit(1);
    if (a?.email) return a.email;
    const [s] = await db.select({ clientId: sessions.clientId }).from(sessions).where(eq(sessions.audioUrl, target.fileUrl)).limit(1);
    clientId = s?.clientId;
  }
  if (!clientId && target.eventId) {
    const [e] = await db.select({ clientId: calendarEvents.clientId }).from(calendarEvents).where(eq(calendarEvents.id, target.eventId)).limit(1);
    clientId = e?.clientId;
  }
  if (!clientId) return null;
  const [c] = await db.select({ email: clients.email }).from(clients).where(eq(clients.id, clientId)).limit(1);
  return c?.email || null;
}

// action: login|view|update|delete|download|whoop_connect|whoop_disconnect|withdraw
export async function logAccess({ actor, action, resource = null, target = null, path = null, sessionId = null }) {
  if (!actor || !action) return;
  try {
    const t = target || {};
    const targetEmail = target ? await resolveTargetEmail(t) : null;
    await db.insert(accessLogs).values({
      actorEmail: actor,
      actorRole: isCoachEmail(actor) ? "coach" : "athlete",
      action,
      resource,
      targetEmail,
      targetRef: t.clientId || t.sessionId || t.eventId || t.ref || t.fileUrl || null,
      path,
      sessionId,
      ...requestInfo(),
    }).onConflictDoNothing();
  } catch (e) {
    console.error("access log failed:", action, e?.message);
  }
}

// 보관 기간이 지난 기록 삭제 — 선수 1년, 코치·운영자 2년 (DB 트리거도 같은 기준으로 확인)
export async function deleteExpiredAccessLogs() {
  const rows = await db.delete(accessLogs).where(or(
    and(eq(accessLogs.actorRole, "coach"), lt(accessLogs.at, dsql`now() - interval '2 years'`)),
    and(dsql`${accessLogs.actorRole} <> 'coach'`, lt(accessLogs.at, dsql`now() - interval '1 year'`)),
  )).returning({ id: accessLogs.id });
  return rows.length;
}
