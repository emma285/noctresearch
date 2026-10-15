// lib/whoop/api.js — WHOOP v2 API 호출 + 응답 → DB 행 변환. (docs/whoop-integration-design.md §3)
// DB 접근 없음(순수 HTTP·변환) → 테스트하기 쉽게 store.js와 분리.

export const WHOOP_AUTH_URL = "https://api.prod.whoop.com/oauth/oauth2/auth";
export const WHOOP_TOKEN_URL = "https://api.prod.whoop.com/oauth/oauth2/token";
export const WHOOP_API_BASE = "https://api.prod.whoop.com/developer";
// offline 없으면 refresh token이 안 나옴 → 반드시 포함
export const WHOOP_SCOPES = "read:sleep read:recovery read:cycles read:workout read:profile offline";

export function buildAuthorizeUrl(state) {
  const u = new URL(WHOOP_AUTH_URL);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("client_id", process.env.WHOOP_CLIENT_ID || "");
  u.searchParams.set("redirect_uri", process.env.WHOOP_REDIRECT_URI || ""); // 대시보드값과 정확히 일치
  u.searchParams.set("scope", WHOOP_SCOPES);
  u.searchParams.set("state", state);
  return u.toString();
}

async function postToken(params) {
  const body = new URLSearchParams({
    ...params,
    client_id: process.env.WHOOP_CLIENT_ID || "",
    client_secret: process.env.WHOOP_CLIENT_SECRET || "",
  });
  const res = await fetch(WHOOP_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(`whoop token ${res.status}: ${json.error || "request failed"}`);
    err.status = res.status;
    err.code = json.error; // invalid_grant → 재연결 필요
    throw err;
  }
  return json; // { access_token, refresh_token, expires_in, scope, token_type }
}

// code → token (callback)
export function exchangeCode(code) {
  return postToken({
    grant_type: "authorization_code",
    code,
    redirect_uri: process.env.WHOOP_REDIRECT_URI || "",
  });
}

// refresh (rotating — 응답의 새 refresh_token으로 반드시 덮어쓰기)
export function refreshTokens(refreshToken) {
  return postToken({ grant_type: "refresh_token", refresh_token: refreshToken, scope: "offline" });
}

// GET /v2/... — 429(rate limit)면 Retry-After만큼 1회 대기 후 재시도
export async function whoopGet(path, accessToken, query = {}) {
  const u = new URL(WHOOP_API_BASE + path);
  for (const [k, v] of Object.entries(query)) if (v != null && v !== "") u.searchParams.set(k, v);
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch(u, { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" });
    if (res.status === 429 && attempt === 0) {
      const wait = Math.min(Number(res.headers.get("retry-after")) || 5, 30);
      await new Promise((r) => setTimeout(r, wait * 1000));
      continue;
    }
    if (!res.ok) {
      const err = new Error(`whoop GET ${path} ${res.status}`);
      err.status = res.status;
      throw err;
    }
    return res.json();
  }
}

// 컬렉션 페이지네이션 — next_token 없어질 때까지 (limit 최대 25)
export async function fetchAllRecords(path, accessToken, { start, end } = {}, maxPages = 20) {
  const out = [];
  let nextToken;
  for (let page = 0; page < maxPages; page++) {
    const json = await whoopGet(path, accessToken, { limit: 25, start, end, nextToken });
    out.push(...(json?.records || []));
    nextToken = json?.next_token;
    if (!nextToken) break;
  }
  return out;
}

// score_state가 SCORED일 때만 값을 채움. 아니면 null (없는 데이터 임의 생성 금지)
export function mapSleep(rec, userEmail) {
  const scored = rec.score_state === "SCORED" && rec.score;
  const st = scored ? rec.score.stage_summary || {} : {};
  const need = scored ? rec.score.sleep_needed : null;
  const v = (x) => (scored && x != null ? x : null);
  return {
    sleepId: rec.id,
    userEmail,
    cycleId: rec.cycle_id ?? null,
    startTs: rec.start ? new Date(rec.start) : null,
    endTs: rec.end ? new Date(rec.end) : null,
    tzOffset: rec.timezone_offset ?? null,
    isNap: rec.nap ?? null,
    scoreState: rec.score_state ?? null,
    inBedMs: v(st.total_in_bed_time_milli),
    awakeMs: v(st.total_awake_time_milli),
    lightMs: v(st.total_light_sleep_time_milli),
    swsMs: v(st.total_slow_wave_sleep_time_milli),
    remMs: v(st.total_rem_sleep_time_milli),
    sleepCycles: v(st.sleep_cycle_count),
    disturbances: v(st.disturbance_count),
    sleepPerfPct: v(rec.score?.sleep_performance_percentage),
    sleepEffPct: v(rec.score?.sleep_efficiency_percentage),
    sleepConsistencyPct: v(rec.score?.sleep_consistency_percentage),
    respiratoryRate: v(rec.score?.respiratory_rate),
    sleepNeedMs: need
      ? (need.baseline_milli || 0) + (need.need_from_sleep_debt_milli || 0)
        + (need.need_from_recent_strain_milli || 0) + (need.need_from_recent_nap_milli || 0)
      : null,
    raw: rec,
    updatedAt: new Date(),
  };
}

export function mapRecovery(rec, userEmail) {
  const s = rec.score_state === "SCORED" && rec.score ? rec.score : null;
  const v = (x) => (s && x != null ? x : null);
  return {
    cycleId: rec.cycle_id,
    userEmail,
    sleepId: rec.sleep_id ?? null,
    scoreState: rec.score_state ?? null,
    recoveryScore: v(s?.recovery_score),
    restingHr: v(s?.resting_heart_rate),
    hrvRmssdMs: v(s?.hrv_rmssd_milli),
    spo2Pct: v(s?.spo2_percentage),
    skinTempC: v(s?.skin_temp_celsius),
    raw: rec,
    updatedAt: new Date(),
  };
}
