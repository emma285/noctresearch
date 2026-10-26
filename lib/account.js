// lib/account.js — 회원 탈퇴: 선수 본인의 모든 데이터 삭제 (개인정보처리방침 4번 "회원 탈퇴 시까지").
// 순서: WHOOP(권한 해제+기록) → 업로드 파일(Blob) → clientId 하위 테이블 → 이메일 기준 테이블 → clients 행.
// Clerk 계정 삭제는 호출부(/api/account/delete)가 마지막에 처리. 중간에 실패해도 다시 실행하면 이어서 지워짐.
import { eq, inArray, or, sql as dsql } from "drizzle-orm";
import { del } from "@vercel/blob";
import { db, schema } from "./db/index.js";
import { deleteWhoopData } from "./whoop/store.js";

const { clients, intakeResponses, logs, sleepTargets, attachments, sessions, calendarEvents, reports } = schema;

const isBlobUrl = (u) => {
  try { return new URL(u).hostname.endsWith(".blob.vercel-storage.com"); } catch { return false; }
};

export async function deleteAccountData(email) {
  const key = String(email || "").trim().toLowerCase();
  if (!key) return false;

  const clientRows = await db.select({ id: clients.id }).from(clients).where(dsql`lower(${clients.email}) = ${key}`);
  const clientIds = clientRows.map((r) => r.id);
  const byEmail = (col) => dsql`lower(${col}) = ${key}`;
  const mine = (table) => (clientIds.length
    ? or(inArray(table.clientId, clientIds), byEmail(table.userEmail))
    : byEmail(table.userEmail));

  await deleteWhoopData(email);

  // 업로드 파일: 준비자료 첨부 + 세션 녹음
  const attRows = await db.select({ data: attachments.data }).from(attachments).where(mine(attachments));
  const sesRows = clientIds.length
    ? await db.select({ audioUrl: sessions.audioUrl }).from(sessions).where(inArray(sessions.clientId, clientIds))
    : [];
  const urls = [
    ...attRows.flatMap((r) => (r.data?.files || []).map((f) => f?.url)),
    ...sesRows.map((r) => r.audioUrl),
  ].filter(isBlobUrl);
  if (urls.length) await del(urls);

  await db.delete(attachments).where(mine(attachments));
  await db.delete(logs).where(mine(logs));
  if (clientIds.length) {
    for (const table of [intakeResponses, sleepTargets, sessions, calendarEvents, reports]) {
      await db.delete(table).where(inArray(table.clientId, clientIds));
    }
    await db.delete(clients).where(inArray(clients.id, clientIds));
  }
  return true;
}
