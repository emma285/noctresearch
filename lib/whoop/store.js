// lib/whoop/store.js — WHOOP 연결/데이터 Neon 저장. 토큰은 항상 암호화 상태로만 DB에 들어감.
import { eq, getTableColumns, sql } from "drizzle-orm";
import { db, schema } from "../db/index.js";
import { encryptToken, decryptToken } from "./crypto.js";
import { refreshTokens, fetchAllRecords, mapSleep, mapRecovery } from "./api.js";

const { whoopConnections, whoopSleep, whoopRecovery } = schema;

// 만료 60초 전부터는 갱신 대상으로 본다
const EXPIRY_MARGIN_MS = 60 * 1000;

export async function getConnection(email) {
  if (!email) return null;
  const [row] = await db.select().from(whoopConnections).where(eq(whoopConnections.userEmail, email)).limit(1);
  return row || null;
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
export async function getAccessToken(conn) {
  if (!conn || conn.status !== "active") throw new Error("whoop connection not active");
  if (new Date(conn.expiresAt).getTime() - Date.now() > EXPIRY_MARGIN_MS) {
    return decryptToken(conn.accessTokenEnc);
  }
  try {
    const tokens = await refreshTokens(decryptToken(conn.refreshTokenEnc));
    await saveConnection({ email: conn.userEmail, whoopUserId: conn.whoopUserId, tokens });
    return tokens.access_token;
  } catch (e) {
    if (e.status === 400 || e.status === 401) {
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
