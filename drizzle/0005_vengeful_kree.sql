-- WHOOP 연동 테이블만 생성. attachments·sleep_targets·sessions.n(real)은 이미 DB에 수동 반영돼 있어 이 마이그레이션에서 제외함 (스냅샷은 현재 schema.js 기준으로 동기화).
-- cycle_id·whoop_user_id는 WHOOP OpenAPI 기준 int64 → bigint (설계문서의 integer에서 변경).
CREATE TABLE "whoop_connections" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" text,
	"user_email" text NOT NULL,
	"whoop_user_id" bigint,
	"access_token_enc" text NOT NULL,
	"refresh_token_enc" text NOT NULL,
	"scope" text,
	"expires_at" timestamp with time zone NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "whoop_connections_user_email_unique" UNIQUE("user_email")
);
--> statement-breakpoint
CREATE TABLE "whoop_recovery" (
	"cycle_id" bigint PRIMARY KEY NOT NULL,
	"user_email" text NOT NULL,
	"sleep_id" text,
	"score_state" text,
	"recovery_score" real,
	"resting_hr" real,
	"hrv_rmssd_ms" real,
	"spo2_pct" real,
	"skin_temp_c" real,
	"raw" jsonb DEFAULT '{}'::jsonb,
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "whoop_sleep" (
	"sleep_id" text PRIMARY KEY NOT NULL,
	"user_email" text NOT NULL,
	"cycle_id" bigint,
	"start_ts" timestamp with time zone,
	"end_ts" timestamp with time zone,
	"tz_offset" text,
	"is_nap" boolean,
	"score_state" text,
	"in_bed_ms" integer,
	"awake_ms" integer,
	"light_ms" integer,
	"sws_ms" integer,
	"rem_ms" integer,
	"sleep_cycles" integer,
	"disturbances" integer,
	"sleep_perf_pct" real,
	"sleep_eff_pct" real,
	"sleep_consistency_pct" real,
	"respiratory_rate" real,
	"sleep_need_ms" integer,
	"raw" jsonb DEFAULT '{}'::jsonb,
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "whoop_connections" ADD CONSTRAINT "whoop_connections_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;
