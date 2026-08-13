ALTER TABLE "sessions" ADD COLUMN "n" integer;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "title" text;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "topics" jsonb DEFAULT '[]'::jsonb;