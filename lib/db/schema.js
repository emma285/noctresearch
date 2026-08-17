// lib/db/schema.js — Drizzle 스키마 (Neon/Postgres).
// athlete/general 겸용: clients.type + JSONB로 분기 흡수. 코칭·기록·세션·일정·리포트는 공통.
// id는 text PK(default uuid) — Notion 마이그레이션 시 기존 page id를 그대로 넣어 relation 매핑 편하게.
import { pgTable, text, integer, boolean, timestamp, date, jsonb } from "drizzle-orm/pg-core";
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

// 코칭 세션 공용
export const sessions = pgTable("sessions", {
  id: id(),
  clientId: text("client_id").references(() => clients.id),
  n: integer("n"),                                   // 회차 (1차, 2차…)
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
