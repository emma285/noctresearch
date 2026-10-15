// lib/db/schema.js — Drizzle 스키마 (Neon/Postgres).
// athlete/general 겸용: clients.type + JSONB로 분기 흡수. 코칭·기록·세션·일정·리포트는 공통.
// id는 text PK(default uuid) — Notion 마이그레이션 시 기존 page id를 그대로 넣어 relation 매핑 편하게.
import { pgTable, text, integer, bigint, real, boolean, timestamp, date, jsonb } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

const id = () => text("id").primaryKey().default(sql`gen_random_uuid()`);
const createdAt = () => timestamp("created_at", { withTimezone: true }).defaultNow();

// 사람(마스터) — athlete·general 공용
export const clients = pgTable("clients", {
  id: id(),
  email: text("email").notNull().unique(),
  clerkUserId: text("clerk_user_id"),
  name: text("name"),
  type: text("type").notNull().default("athlete"),   // 'athlete' | 'general'  ← 분기 핵심
  status: text("status"),
  program: text("program"),
  nextSession: timestamp("next_session", { withTimezone: true }),
  week: integer("week"),
  tier: text("tier"),
  profile: jsonb("profile").default({}),             // 타입별 고유필드 (athlete: 종목·팀 / general: 직업·목표)
  notionId: text("notion_id"),                       // 마이그레이션 매핑용(구 Notion page id)
  createdAt: createdAt(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// 설문 답변 (분기) — 문항 세트가 타입별로 달라도 JSONB라 스키마 불변
export const intakeResponses = pgTable("intake_responses", {
  id: id(),
  clientId: text("client_id").references(() => clients.id),
  type: text("type").notNull(),                      // 'athlete' | 'general'
  answers: jsonb("answers").notNull().default({}),   // { 문항key: 답 }
  submittedAt: timestamp("submitted_at", { withTimezone: true }).defaultNow(),
});

// 기록 (수면·루틴) 공용 — 루틴 활동종류(훈련/운동/…)는 data JSONB 문자열, 앱이 타입별 옵션 제공
export const logs = pgTable("logs", {
  id: id(),
  clientId: text("client_id").references(() => clients.id),  // clients 이전 후 채움(현재 null 허용)
  userEmail: text("user_email"),                     // 이메일 직접 조회용 — clients 없이 로그 독립 동작
  date: date("date").notNull(),
  kind: text("kind").notNull(),                      // 'sleep' | 'routine'
  summary: text("summary"),
  data: jsonb("data").default({}),
  notionId: text("notion_id"),                       // 마이그레이션 매핑용(구 Notion page id)
  createdAt: createdAt(),
});

// 하루별 목표 수면 (프로토콜 계획) — 실제 로그(logs)와 겹쳐 "목표 vs 실제" 비교.
// bedMin/wakeMin = 자정 기준 분(로그 data.bed/wake와 동일 인코딩). date = 기상일 기준(로그와 정렬).
export const sleepTargets = pgTable("sleep_targets", {
  id: id(),
  clientId: text("client_id").references(() => clients.id),
  date: date("date").notNull(),                      // 기상일 (logs.date와 동일 기준)
  bedMin: integer("bed_min"),                        // 목표 취침 (자정 기준 분)
  wakeMin: integer("wake_min"),                      // 목표 기상 (자정 기준 분)
  label: text("label"),                              // "미루기 D1" 등 그날 프로토콜 라벨
  protocolEventId: text("protocol_event_id"),        // 연결된 프로토콜 calendar_events.id (선택)
  createdAt: createdAt(),
});

// 선수가 올린 첨부 자료 (코칭 준비자료 등) — 코치 앱에서 조회. userEmail로 선수 식별.
export const attachments = pgTable("attachments", {
  id: id(),
  clientId: text("client_id").references(() => clients.id),  // 매핑되면 채움(선택)
  userEmail: text("user_email"),                     // 선수 식별 기본키(로그와 동일 방식)
  kind: text("kind").notNull(),                      // 'prep'(코칭 준비자료) | 'garmin'
  note: text("note"),                                // 요약(항목 미리보기)
  data: jsonb("data").default({}),                   // { items:[{type,text}], files:[{name,url}] }
  createdAt: createdAt(),
});

// 코칭 세션 공용
export const sessions = pgTable("sessions", {
  id: id(),
  clientId: text("client_id").references(() => clients.id),
  n: real("n"),                                      // 회차 (1, 1.5, 2… · 0.5 반 회차 허용)
  title: text("title"),                              // 세션 제목
  topics: jsonb("topics").default([]),               // 다룬 토픽
  sessionAt: timestamp("session_at", { withTimezone: true }),
  summary: text("summary"),
  actionItems: text("action_items"),
  coachComment: text("coach_comment"),
  published: boolean("published").default(false),
  publishedAt: timestamp("published_at", { withTimezone: true }), // 공개 토글 켠 시각(선수 홈 NEW 판정)
  seenAt: timestamp("seen_at", { withTimezone: true }),           // 선수가 노트를 본 시각(NEW 해제)
  detail: jsonb("detail").default({}),               // 상세 노트(구조화, 세션 후 녹음 기반)
  guide: jsonb("guide").default({}),                 // 세션 가이드(세션 전 준비: 논의·목표·확인·질문·메모)
  audioUrl: text("audio_url"),
  transcript: text("transcript"),
  notionId: text("notion_id"),
  createdAt: createdAt(),
});

// 일정 공용 — type: athlete(경기/이동/훈련/기타) · general(운동/약속/기타). 앱이 타입별 옵션
export const calendarEvents = pgTable("calendar_events", {
  id: id(),
  clientId: text("client_id").references(() => clients.id),
  type: text("type"),
  title: text("title"),
  startDate: date("start_date"),
  endDate: date("end_date"),
  memo: text("memo"),
  isPublic: boolean("is_public").default(true),
  source: text("source"),                            // 'coach' | 'client'
  createdAt: createdAt(),
});

// 리포트 공용
export const reports = pgTable("reports", {
  id: id(),
  clientId: text("client_id").references(() => clients.id),
  slug: text("slug"),
  title: text("title"),
  published: boolean("published").default(false),
  data: jsonb("data").default({}),
  createdAt: createdAt(),
});

// === WHOOP 연동 === (docs/whoop-integration-design.md §4)
// 연결/토큰 (선수당 1행). 토큰은 AES-256-GCM 암호화된 문자열로 저장 — 평문 저장 금지.
export const whoopConnections = pgTable("whoop_connections", {
  id: id(),
  clientId: text("client_id").references(() => clients.id),
  userEmail: text("user_email").notNull().unique(),   // 조회 키(Clerk 이메일)
  whoopUserId: bigint("whoop_user_id", { mode: "number" }), // WHOOP int64
  accessTokenEnc: text("access_token_enc").notNull(),
  refreshTokenEnc: text("refresh_token_enc").notNull(), // rotating: 갱신마다 덮어쓰기
  scope: text("scope"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(), // access 만료
  status: text("status").notNull().default("active"),  // active|revoked|needs_reauth
  connectedAt: createdAt(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// 수면 (score_state=SCORED일 때만 값, 아니면 null)
export const whoopSleep = pgTable("whoop_sleep", {
  sleepId: text("sleep_id").primaryKey(),              // WHOOP UUID
  userEmail: text("user_email").notNull(),
  cycleId: bigint("cycle_id", { mode: "number" }),   // WHOOP 전체 기준 int64 일련번호
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
  raw: jsonb("raw").default({}),          // 원본 통째 보존
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
