CREATE TABLE "whoop_cycle" (
	"cycle_id" bigint PRIMARY KEY NOT NULL,
	"user_email" text NOT NULL,
	"start_ts" timestamp with time zone,
	"end_ts" timestamp with time zone,
	"tz_offset" text,
	"score_state" text,
	"strain" real,
	"kilojoule" real,
	"avg_hr" real,
	"max_hr" real,
	"step_count" integer,
	"raw" jsonb DEFAULT '{}'::jsonb,
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "whoop_workout" (
	"workout_id" text PRIMARY KEY NOT NULL,
	"user_email" text NOT NULL,
	"cycle_id" bigint,
	"sport_name" text,
	"start_ts" timestamp with time zone,
	"end_ts" timestamp with time zone,
	"tz_offset" text,
	"score_state" text,
	"strain" real,
	"kilojoule" real,
	"avg_hr" real,
	"max_hr" real,
	"distance_m" real,
	"zone4_ms" integer,
	"zone5_ms" integer,
	"raw" jsonb DEFAULT '{}'::jsonb,
	"updated_at" timestamp with time zone DEFAULT now()
);
