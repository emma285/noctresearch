// lib/whoop/store.js — WHOOP 연결/데이터 Neon 저장. 토큰은 항상 암호화 상태로만 DB에 들어감.
import { and, eq, lt, desc, getTableColumns, sql } from "drizzle-orm";
import { db, schema } from "../db/index.js";
import { encryptToken, decryptToken } from "./crypto.js";
import { refreshTokens, fetchAllRecords, whoopGet, mapSleep, mapRecovery } from "./api.js";
import { planWebhookAction } from "./webhook.js";

const { whoopConnections, whoopSleep, whoopRecovery } = schema;

// 만료 60초 전부터는 갱신 대상으로 본다
const EXPIRY_MARGIN_MS = 60 * 1000;

export async function getConnection(email) {
  if (!email) return null;
  const [row] = await db.select().from(whoopConnections).where(eq(whoopConnections.userEmail, email)).limit(1);
  return row || null;
}

// 같은 WHOOP 계정이 "다른" 앱 계정에 연결돼 있으면 그 이메일 반환(중복 연결 막기). 해제·재연결 필요 상태는 제외.
export async function findOtherActiveEmail(whoopUserId, email) {
  if (whoopUserId == null) return null;
  const rows = await db.select({ userEmail: whoopConnections.userEmail }).from(whoopConnections)
    .where(and(eq(whoopConnections.whoopUserId, Number(whoopUserId)), eq(whoopConnections.status, "active")));
  return rows.find((r) => r.userEmail !== email)?.userEmail || null;
}

// 토큰 응답 → 연결 행 저장(선수당 1행, userEmail 기준 upsert)
export async function saveConnection({ email, whoopUserId = null, tokens }) {
  const values = {
    userEmail: email,
    whoopUserId,
    accessTokenEnc: encryptToken(tokens.access_token),
    refreshTokenEnc: encryptToken(tokens.refresh_token),
    scope: tokens.scope || null,
    expiresAt: new Date(Date.now() + (Number(tokens.expires_in) || 3600) * 1000),
    status: "active",
    updatedAt: new Date(),
  };
  const { userEmail, ...update } = values;
  await db.insert(whoopConnections).values(values)
    .onConflictDoUpdate({ target: whoopConnections.userEmail, set: update });
}

// 유효한 access token 반환. 만료 임박이면 refresh(rotating → 새 refresh token 덮어쓰기).
// refresh가 invalid_grant 등으로 거절되면 status='needs_reauth'로 바꾸고 에러.
// marginMs: 만료까지 이보다 적게 남았으면 갱신 (cron은 크게 줘서 미리 갱신)
export async function getAccessToken(conn, marginMs = EXPIRY_MARGIN_MS) {
  if (!conn || conn.status !== "active") throw new Error("whoop connection not active");
  if (new Date(conn.expiresAt).getTime() - Date.now() > marginMs) {
    return decryptToken(conn.accessTokenEnc);
  }
  try {
    const tokens = await refreshTokens(decryptToken(conn.refreshTokenEnc));
    await saveConnection({ email: conn.userEmail, whoopUserId: conn.whoopUserId, tokens });
    return tokens.access_token;
  } catch (e) {
    if (e.status === 400 || e.status === 401) {
      // rotating refresh: 웹훅과 cron이 동시에 갱신하면 늦은 쪽은 옛 refresh token이라 거절됨.
      // 그 사이 다른 쪽이 새 토큰을 저장했으면 그걸 쓰고, 재연결 필요로 잘못 표시하지 않는다.
      const latest = await getConnection(conn.userEmail);
      if (latest?.status === "active" && latest.refreshTokenEnc !== conn.refreshTokenEnc) {
        return decryptToken(latest.accessTokenEnc);
      }
      await db.update(whoopConnections)
        .set({ status: "needs_reauth", updatedAt: new Date() })
        .where(eq(whoopConnections.userEmail, conn.userEmail));
    }
    throw e;
  }
}

// 여러 행 upsert — PK 충돌 시 나머지 컬럼을 새 값(excluded)으로 덮어씀
async function upsertMany(table, pkColumn, rows) {
  if (!rows.length) return 0;
  const set = {};
  for (const [key, col] of Object.entries(getTableColumns(table))) {
    if (col.name !== pkColumn.name) set[key] = sql.raw(`excluded."${col.name}"`);
  }
  await db.insert(table).values(rows).onConflictDoUpdate({ target: pkColumn, set });
  return rows.length;
}

export const upsertSleeps = (rows) => upsertMany(whoopSleep, whoopSleep.sleepId, rows);
export const upsertRecoveries = (rows) => upsertMany(whoopRecovery, whoopRecovery.cycleId, rows);

// 연결 직후 과거 N일 수면·회복 수집
export async function backfill(email, accessToken, days = 30) {
  const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const [sleeps, recoveries] = await Promise.all([
    fetchAllRecords("/v2/activity/sleep", accessToken, { start }),
    fetchAllRecords("/v2/recovery", accessToken, { start }),
  ]);
  const s = await upsertSleeps(sleeps.map((r) => mapSleep(r, email)));
  const r = await upsertRecoveries(recoveries.map((x) => mapRecovery(x, email)));
  return { sleep: s, recovery: r };
}

// 연결 해제 — WHOOP 쪽 권한 회수(best-effort) 후 토큰 폐기, status='revoked'.
// 이미 쌓인 수면·회복 데이터는 남겨둔다(코칭 기록).
export async function disconnect(email) {
  const conn = await getConnection(email);
  if (!conn) return false;
  if (conn.status === "active") {
    try {
      const token = await getAccessToken(conn);
      await fetch("https://api.prod.whoop.com/developer/v2/user/access", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
    } catch (e) {
      console.error("whoop revoke failed:", e?.message);
    }
  }
  await db.update(whoopConnections)
    .set({ status: "revoked", accessTokenEnc: "", refreshTokenEnc: "", updatedAt: new Date() })
    .where(eq(whoopConnections.userEmail, email));
  return true;
}

// === Phase 2: 웹훅 처리 ===
// payload.user_id(WHOOP 사용자) → 우리 연결 행. 연결 해제/재연결 필요 상태면 null(=무시).
async function getActiveConnectionByWhoopUser(whoopUserId) {
  const [row] = await db.select().from(whoopConnections)
    .where(and(eq(whoopConnections.whoopUserId, Number(whoopUserId)), eq(whoopConnections.status, "active")))
    .limit(1);
  return row || null;
}

// 404(그 사이 WHOOP에서 지워짐)는 null로 → 조용히 무시
async function getOrNull(path, token) {
  try {
    return await whoopGet(path, token);
  } catch (e) {
    if (e.status === 404) return null;
    throw e;
  }
}

// 웹훅 1건 처리. 결과 문자열 반환(로그용). 일시적 오류(WHOOP 5xx, DB)는 throw → 라우트가 500 → WHOOP 재시도.
export async function handleWebhookEvent(event) {
  const plan = planWebhookAction(event);
  if (plan.action === "ignore") return `ignored:${plan.reason}`;

  const conn = await getActiveConnectionByWhoopUser(event.user_id);
  if (!conn) return "ignored:no_active_connection";
  const email = conn.userEmail;

  if (plan.action === "delete_sleep") {
    await db.delete(whoopSleep)
      .where(and(eq(whoopSleep.sleepId, plan.sleepId), eq(whoopSleep.userEmail, email)));
    return "sleep_deleted";
  }
  if (plan.action === "delete_recovery") {
    await db.delete(whoopRecovery)
      .where(and(eq(whoopRecovery.sleepId, plan.sleepId), eq(whoopRecovery.userEmail, email)));
    return "recovery_deleted";
  }

  const token = await getAccessToken(conn);
  const sleep = await getOrNull(`/v2/activity/sleep/${encodeURIComponent(plan.sleepId)}`, token);
  if (!sleep) return "ignored:sleep_not_found";
  await upsertSleeps([mapSleep(sleep, email)]);
  if (plan.action === "upsert_sleep") return "sleep_saved";

  // recovery 웹훅 id = 수면 UUID → 수면의 cycle_id로 회복 조회
  if (sleep.cycle_id == null) return "ignored:no_cycle";
  const rec = await getOrNull(`/v2/cycle/${sleep.cycle_id}/recovery`, token);
  if (!rec) return "ignored:recovery_not_found";
  await upsertRecoveries([mapRecovery(rec, email)]);
  return "recovery_saved";
}

// === Phase 2: 토큰 갱신 cron ===
// 곧 만료될 active 연결만 미리 갱신. 결과 개수 반환(이메일·토큰은 로그에 안 남김).
export async function refreshExpiringConnections(marginMs = 10 * 60 * 1000) {
  const soon = new Date(Date.now() + marginMs);
  const rows = await db.select().from(whoopConnections)
    .where(and(eq(whoopConnections.status, "active"), lt(whoopConnections.expiresAt, soon)));
  const result = { checked: rows.length, refreshed: 0, needsReauth: 0, failed: 0 };
  for (const conn of rows) {
    try {
      await getAccessToken(conn, marginMs);
      result.refreshed++;
    } catch (e) {
      // 400/401이면 getAccessToken이 이미 needs_reauth로 바꿔둠. 그 외(WHOOP 장애 등)는 다음 시간에 재시도
      if (e.status === 400 || e.status === 401) result.needsReauth++;
      else result.failed++;
    }
  }
  return result;
}

// === 동기화: 매일 12:00 KST 자동(cron) + 코치 수동 버튼 ===
// 최근 N일을 WHOOP에서 다시 받아 덮어쓰기 → 웹훅이 놓친 기록을 채움. 성공하면 마지막 확인 시각 기록.
// 코치 화면의 "마지막 확인" 시각이 오늘이면, 그래도 비어 있는 날은 WHOOP에도 기록이 없는 것(미착용 등).
const SYNC_DAYS = 3;

async function countRecords(email) {
  const [[s], [r]] = await Promise.all([
    db.select({ n: sql`count(*)::int` }).from(whoopSleep).where(eq(whoopSleep.userEmail, email)),
    db.select({ n: sql`count(*)::int` }).from(whoopRecovery).where(eq(whoopRecovery.userEmail, email)),
  ]);
  return (s?.n || 0) + (r?.n || 0);
}

// 결과: { ok: true, added, latestSleepEnd, checkedAt } | { ok: false, reason: 'not_connected'|'needs_reauth' }
// 일시적 오류(WHOOP 장애 등)는 throw
export async function syncConnection(conn, source = "auto") {
  if (!conn || conn.status !== "active") return { ok: false, reason: conn?.status === "needs_reauth" ? "needs_reauth" : "not_connected" };
  let token;
  try {
    token = await getAccessToken(conn);
  } catch (e) {
    if (e.status === 400 || e.status === 401) return { ok: false, reason: "needs_reauth" };
    throw e;
  }
  const before = await countRecords(conn.userEmail);
  await backfill(conn.userEmail, token, SYNC_DAYS);
  const after = await countRecords(conn.userEmail);
  const checkedAt = new Date();
  await db.update(whoopConnections)
    .set({ lastCheckedAt: checkedAt, lastCheckSource: source })
    .where(eq(whoopConnections.userEmail, conn.userEmail));
  const [latest] = await db.select({ endTs: whoopSleep.endTs }).from(whoopSleep)
    .where(and(eq(whoopSleep.userEmail, conn.userEmail), eq(whoopSleep.isNap, false)))
    .orderBy(desc(whoopSleep.endTs)).limit(1);
  return { ok: true, added: Math.max(0, after - before), latestSleepEnd: latest?.endTs || null, checkedAt };
}

// cron: active 연결 전원. 결과 개수만 반환(이메일·토큰은 로그에 안 남김). 한 명 실패해도 나머지는 계속.
export async function syncAllConnections() {
  const rows = await db.select().from(whoopConnections).where(eq(whoopConnections.status, "active"));
  const result = { checked: rows.length, synced: 0, added: 0, needsReauth: 0, failed: 0 };
  for (const conn of rows) {
    try {
      const r = await syncConnection(conn, "auto");
      if (r.ok) { result.synced++; result.added += r.added; }
      else if (r.reason === "needs_reauth") result.needsReauth++;
    } catch {
      result.failed++;
    }
  }
  return result;
}
