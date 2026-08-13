CREATE TABLE "calendar_events" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" text,
	"type" text,
	"title" text,
	"start_date" date,
	"end_date" date,
	"memo" text,
	"is_public" boolean DEFAULT true,
	"source" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"clerk_user_id" text,
	"name" text,
	"type" text DEFAULT 'athlete' NOT NULL,
	"status" text,
	"program" text,
	"next_session" timestamp with time zone,
	"week" integer,
	"tier" text,
	"profile" jsonb DEFAULT '{}'::jsonb,
	"notion_id" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "clients_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "intake_responses" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" text,
	"type" text NOT NULL,
	"answers" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "logs" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" text,
	"date" date NOT NULL,
	"kind" text NOT NULL,
	"summary" text,
	"data" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" text,
	"slug" text,
	"title" text,
	"published" boolean DEFAULT false,
	"data" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" text,
	"session_at" timestamp with time zone,
	"summary" text,
	"action_items" text,
	"coach_comment" text,
	"published" boolean DEFAULT false,
	"detail" jsonb DEFAULT '{}'::jsonb,
	"audio_url" text,
	"transcript" text,
	"notion_id" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intake_responses" ADD CONSTRAINT "intake_responses_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "logs" ADD CONSTRAINT "logs_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;