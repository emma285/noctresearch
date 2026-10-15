# WHOOP 연동 설계 (선수 웨어러블 데이터)

> 상태: **설계 확정, 미구현.** 착수 시 이 문서를 레퍼런스로.
> 대상: 운동선수(WHOOP 유저) — HRV·recovery·수면단계를 포탈 리포트에 자동 반영.
> 스택: 이 레포(Next.js App Router + Vercel + Neon/drizzle + Clerk)에 그대로 얹음.
> 작성: 2026-09-25. 스펙 출처는 문서 하단 참조.

---

## 0. 왜 / 무엇을

- 선수는 WHOOP 보급률이 있는 층(특히 해외 원정 프로). WHOOP는 **HRV·recovery score**가 강점 → 회복/컨디션 코칭에 직결.
- export 수동 전송(가민 방식)과 달리, **한 번 OAuth 연결하면 이후 자동 유입**(웹훅).
- 국내 일반 코칭 고객은 대부분 가민/애플/삼성 → 웁은 **선수 한정**으로 붙인다.

가져올 데이터: **수면(단계·효율·호흡수·수면need), 회복(HRV rmssd·안정시심박·recovery %), (선택)strain**.

---

## 1. 선행조건 (Phase 0, 코드보다 먼저 — Jake가 공유계정으로 수행. Emma는 개인정보처리방침 URL만)

1. `https://developer-dashboard.whoop.com` 에서 앱 등록 (WHOOP 멤버십 필요, 앱 5개까지).
2. **`Client ID` / `Client Secret`** 발급 → env 등록(아래).
3. Redirect URI를 대시보드에 **정확히 일치**하게 등록: `https://noctresearch.vercel.app/api/whoop/callback` (+ 로컬 `http://localhost:3000/api/whoop/callback`).
4. **승인 신청도 동시에 제출** — 개발단계는 **최대 10명**만 연결됨, 실서비스(>10명)는 **심사 필요(수 주 소요)**. 심사 도는 동안 개발 진행.
   - 승인 준비물: API 이용약관 동의 · 앱이름/**연락 이메일=`contact@noct-research.com`**(신규 가입·연동 공식 이메일로 통일) · **개인정보처리방침 URL** · WHOOP 브랜드/디자인 가이드 준수("Connect with WHOOP" 버튼) · 최소 1명 테스트.

> ⚠️ 코드는 Client ID/Secret 없이도 미리 짤 수 있음. 실제 연결 테스트만 발급 후 가능.

---

## 2. env (Vercel 3환경 + `.env.local`)

```
WHOOP_CLIENT_ID=
WHOOP_CLIENT_SECRET=          # 웹훅 HMAC 서명키 겸용
WHOOP_REDIRECT_URI=https://noctresearch.vercel.app/api/whoop/callback
WHOOP_TOKEN_ENC_KEY=          # 토큰 AES 암호화용 32바이트 키
# CRON_SECRET 는 기존 것 재사용(토큰 refresh cron 인증)
```

토큰은 계정접근권+PII → **평문 저장 금지.** `WHOOP_TOKEN_ENC_KEY`로 앱단 AES-256-GCM 암호화 후 Neon 저장(BLOB private 원칙과 동일 결).

---

## 3. API 스펙 (v2 확정)

- **Base**: `https://api.prod.whoop.com/developer` → 엔드포인트는 `/v2/...` (v1은 2025-10-01 종료, 쓰지 않음).
- **OAuth**
  - authorize: `https://api.prod.whoop.com/oauth/oauth2/auth`
  - token: `https://api.prod.whoop.com/oauth/oauth2/token`
  - grant: `authorization_code` + `refresh_token`(rotating)
- **Scopes**: `read:sleep read:recovery read:cycles read:workout read:profile offline`
  - `offline` 없으면 refresh token 안 나옴 → 반드시 포함.
- **Rate limit**: 100 req/분, 10,000 req/일. 초과 429. → 폴링 대신 웹훅.
- **Token**: access TTL **3600s(1h)**. refresh는 **회전(rotating)** — 갱신마다 **새 refresh_token 반환, 반드시 덮어쓰기 저장**(옛것 무효화). refresh TTL은 **미공개** → 만료/폐기 시 재연결 유도.

### 데이터 엔드포인트

| 도메인 | GET | scope |
|---|---|---|
| Sleep(컬렉션) | `/v2/activity/sleep` | read:sleep |
| Sleep(단건) | `/v2/activity/sleep/{sleepId}` (UUID) | read:sleep |
| Recovery | `/v2/recovery` | read:recovery |
| Cycle | `/v2/cycle` , `/v2/cycle/{cycleId}` | read:cycles |
| Workout | `/v2/activity/workout` | read:workout |
| Profile | `/v2/user/profile/basic` | read:profile |
| Body | `/v2/user/measurement/body` | read:body_measurement |

**페이지네이션**: query `limit`(max 25, default 10)·`start`·`end`(ISO8601)·`nextToken`. 응답 `{ records:[...], next_token:"..." }` → `next_token` 없어질 때까지 반복.

**Sleep `score`** (score_state=SCORED일 때만 채워짐):
- `stage_summary`: `total_in_bed_time_milli`·`total_awake_time_milli`·`total_light_sleep_time_milli`·`total_slow_wave_sleep_time_milli`(deep)·`total_rem_sleep_time_milli`·`sleep_cycle_count`·`disturbance_count`
- `sleep_needed`: `baseline_milli`·`need_from_sleep_debt_milli`·`need_from_recent_strain_milli`·`need_from_recent_nap_milli`
- `respiratory_rate`·`sleep_performance_percentage`·`sleep_consistency_percentage`·`sleep_efficiency_percentage`

**Recovery `score`**: `recovery_score`(%)·`resting_heart_rate`·`hrv_rmssd_milli`·`spo2_percentage`·`skin_temp_celsius`·`user_calibrating`(bool).

> **`score_state` 방어처리**: `SCORED | PENDING_SCORE | UNSCORABLE`. SCORED 아니면 `score` 없음 → 행은 저장하되 값은 null, **그리지 않음(점선/미정)**. (없는 데이터 임의로 그리기 금지 원칙)

---

## 4. Neon 스키마 추가 (`lib/db/schema.js`에 append)

기존 컨벤션 그대로: `pgTable`, `text` PK(uuid), `timestamp({withTimezone})`, `jsonb`. 사람 매핑은 `userEmail`(attachments·logs와 동일 키) + `clientId` 옵션.

```js
// === WHOOP 연동 ===
// 연결/토큰 (선수당 1행). 토큰은 AES 암호화된 문자열로 저장.
export const whoopConnections = pgTable("whoop_connections", {
  id: id(),
  clientId: text("client_id").references(() => clients.id),
  userEmail: text("user_email").notNull().unique(),   // 조회 키(clerk 이메일)
  whoopUserId: bigint("whoop_user_id", { mode: "number" }), // WHOOP int64
  accessTokenEnc: text("access_token_enc").notNull(),
  refreshTokenEnc: text("refresh_token_enc").notNull(), // rotating: 갱신마다 덮어쓰기
  scope: text("scope"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(), // access 만료
  status: text("status").notNull().default("active"),  // active|revoked|needs_reauth
  connectedAt: createdAt(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// 수면 (webhook upsert, score_state=SCORED만 값)
export const whoopSleep = pgTable("whoop_sleep", {
  sleepId: text("sleep_id").primaryKey(),              // WHOOP UUID
  userEmail: text("user_email").notNull(),
  cycleId: bigint("cycle_id", { mode: "number" }), // WHOOP int64
  startTs: timestamp("start_ts", { withTimezone: true }),
  endTs: timestamp("end_ts", { withTimezone: true }),
  tzOffset: text("tz_offset"),
  isNap: boolean("is_nap"),
  scoreState: text("score_state"),
  inBedMs: integer("in_bed_ms"),
  awakeMs: integer("awake_ms"),
  lightMs: integer("light_ms"),
  swsMs: integer("sws_ms"),          // deep
  remMs: integer("rem_ms"),
  sleepCycles: integer("sleep_cycles"),
  disturbances: integer("disturbances"),
  sleepPerfPct: real("sleep_perf_pct"),
  sleepEffPct: real("sleep_eff_pct"),
  sleepConsistencyPct: real("sleep_consistency_pct"),
  respiratoryRate: real("respiratory_rate"),
  sleepNeedMs: integer("sleep_need_ms"),  // baseline+debt+strain+nap 합
  raw: jsonb("raw").default({}),          // 원본 통째 보존(전 필드 보존 철칙)
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// 회복 (HRV·RHR·recovery score)
export const whoopRecovery = pgTable("whoop_recovery", {
  cycleId: bigint("cycle_id", { mode: "number" }).primaryKey(), // WHOOP int64
  userEmail: text("user_email").notNull(),
  sleepId: text("sleep_id"),
  scoreState: text("score_state"),
  recoveryScore: real("recovery_score"), // %
  restingHr: real("resting_hr"),
  hrvRmssdMs: real("hrv_rmssd_ms"),
  spo2Pct: real("spo2_pct"),
  skinTempC: real("skin_temp_c"),
  raw: jsonb("raw").default({}),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});
// (strain 필요 시 whoopCycle 동일 패턴 추가. cycle.* 웹훅은 없어서 recovery 올 때 /v2/cycle 당김.)
```

> **변경(2026-10-13, Jake)**: `cycle_id`·`whoop_user_id`는 WHOOP OpenAPI에서 int64로 정의 → `integer`(int32, 최대 약 21억) 대신 `bigint`. cycle_id는 WHOOP 전체 사용자 기준 일련번호라 우리 데이터 양과 무관하게 커짐.

마이그레이션: `drizzle-kit generate` → `drizzle/` 에 SQL → 배포 시 적용(기존 파이프라인 따름).

---

## 5. API 라우트 (`app/api/whoop/*`)

| 라우트 | 역할 |
|---|---|
| `GET /api/whoop/connect` | `state`(CSRF, Clerk uid 바인딩) 생성 → WHOOP authorize로 302 |
| `GET /api/whoop/callback` | `code`→token 교환, 암호화 저장, 초기 30일 백필 트리거 |
| `POST /api/whoop/webhook` | HMAC 서명검증 → 리소스 GET → upsert (대시보드에 이 URL 등록) |
| `GET /api/whoop/status` | 프론트 연결상태 표시 |
| `POST /api/whoop/disconnect` | `status='revoked'`, 토큰 폐기 |
| `GET /api/cron/whoop-refresh` | Vercel Cron, 만료임박 토큰 갱신(아래) |

### OAuth authorize 파라미터
```
GET https://api.prod.whoop.com/oauth/oauth2/auth
  ?response_type=code
  &client_id=$WHOOP_CLIENT_ID
  &redirect_uri=$WHOOP_REDIRECT_URI   // 대시보드값과 정확히 일치
  &scope=read:sleep read:recovery read:cycles read:workout read:profile offline
  &state=<csrf, Clerk userId 서명 포함>
```
### callback (code→token)
```
POST token url  (application/x-www-form-urlencoded)
  grant_type=authorization_code, code, client_id, client_secret, redirect_uri
→ { access_token, refresh_token, expires_in:3600, scope, token_type:"bearer" }
→ AES 암호화 후 whoop_connections upsert(userEmail=현재 Clerk 유저)
→ 초기 백필: /v2/activity/sleep & /v2/recovery 를 start=-30d 로 페이지네이션 수집 upsert
```

### 웹훅 서명검증 (그대로 사용)
```
raw = 요청 원문 바디(파싱 전)
sig = base64( HMAC_SHA256( header['X-WHOOP-Signature-Timestamp'] + raw, WHOOP_CLIENT_SECRET ) )
if sig !== header['X-WHOOP-Signature']  → 401
payload = { user_id, id, type, trace_id }   // id만 옴
switch(type):
  'sleep.updated'    → GET /v2/activity/sleep/{id}  → whoopSleep upsert
  'sleep.deleted'    → whoopSleep 삭제/표시
  'recovery.updated' → GET /v2/recovery (해당 cycle) → whoopRecovery upsert
  'workout.updated'  → (선택)
// trace_id로 중복처리 방지. 이벤트: sleep/recovery/workout .updated|.deleted (cycle.* 없음)
```
> `whoop_user_id`로 어느 선수인지 매핑(연결 시 profile에서 저장해둔 whoopUserId ↔ payload.user_id).

### 토큰 refresh cron
`vercel.json` crons에 추가:
```json
{ "path": "/api/cron/whoop-refresh", "schedule": "0 * * * *" }   // 매시간
```
라우트는 기존 `routine-check` 패턴 복사(`CRON_SECRET` Bearer 확인) →
`expiresAt < now()+10m` 인 active 연결만 골라:
```
POST token url  grant_type=refresh_token, refresh_token, client_id, client_secret,
                scope="offline ..."(발급 스코프 유지)
→ 새 access + 새 refresh 저장(둘 다 갱신, expiresAt=now+3600s)
실패(invalid_grant) → status='needs_reauth' 로, 포탈서 "재연결" 유도
```

---

## 6. 프론트 (선수앱)

- **연결 진입점**: 포탈(`/portal`) 또는 인테이크에서 웨어러블=WHOOP 선택 선수에게 **"WHOOP 연결하기" 카드**. 클릭 → `/api/whoop/connect`.
- 셸 안 iframe/AppShell 규칙 유지(선수화면은 하단 탭바 유지, raw-route 금지).
- **리포트 시각화**: 수면단계 막대·수면효율·HRV 추이·recovery score·안정시심박. 값 없는 날(score_state≠SCORED)은 점선/미정.
- 디자인 톤: NOCT 인디고`#4355B0`+스카이`#7EC8E3`+네이비`#0D1B2A`, 이모지 금지(lucide), 좌측 강조바 금지.

---

## 7. 단계별 실행

- **Phase 0 (Jake, 공유계정)**: 대시보드 앱 등록 + 승인 신청 제출 + Client ID/Secret env 등록. (Emma는 개인정보처리방침 URL만 제공)
- **Phase 1**: OAuth connect/callback + 토큰 암호화 저장 + 30일 백필 → 본인 웁 1명 검증.
- **Phase 2**: 웹훅 수신(서명검증·upsert) + refresh cron → 자동 갱신.
- **Phase 3**: 포탈 리포트 시각화(수면단계/HRV/recovery).

---

## 8. 미해결/주의 (flag)

1. **refresh token TTL 미공개** → `needs_reauth` 폴백 필수.
2. **개발 10명 cap → 실서비스 승인 수 주** → Phase 0에서 승인 먼저.
3. **cycle.\* 웹훅 없음** → strain 필요하면 recovery 웹훅 때 `/v2/cycle` 폴링.
4. 토큰 **평문 저장 금지**(AES).
5. 공식 JS SDK 없음 → OpenAPI(`https://api.prod.whoop.com/developer/doc/openapi.json`)로 타입 생성 권장.
6. WHOOP는 **국내 정식유통 적음**(직구/공식배송) → 대상은 이미 웁 쓰는 선수 한정.

---

## 참조 (스펙 출처)
- WHOOP Developer Docs: OAuth `developer.whoop.com/docs/developing/oauth` · Webhooks `.../webhooks` · Rate limit `.../rate-limiting` · App approval `.../app-approval` · v1→v2 migration `.../v1-v2-migration`
- API 레퍼런스/스코프/필드: `developer.whoop.com/api`
- OpenAPI: `https://api.prod.whoop.com/developer/doc/openapi.json`
- 배송(공식): `support.whoop.com/s/article/Where-does-WHOOP-ship-to`
