// drizzle-kit 설정 — 스키마 → 마이그레이션 SQL 생성/적용.
// 사용: npx drizzle-kit generate  /  npx drizzle-kit push
/** @type {import('drizzle-kit').Config} */
export default {
  schema: "./lib/db/schema.js",
  out: "./drizzle",
  dialect: "postgresql",
  // 마이그레이션은 direct(non-pooled) 연결 사용 — pooler(PgBouncer)는 일부 DDL 미지원
  dbCredentials: { url: process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL },
};
