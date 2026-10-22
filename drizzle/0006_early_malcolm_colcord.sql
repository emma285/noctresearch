ALTER TABLE "whoop_connections" ADD COLUMN "last_checked_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "whoop_connections" ADD COLUMN "last_check_source" text;