CREATE TABLE "access_logs" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"actor_email" text NOT NULL,
	"actor_role" text NOT NULL,
	"action" text NOT NULL,
	"resource" text,
	"target_email" text,
	"target_ref" text,
	"path" text,
	"ip" text,
	"user_agent" text,
	"session_id" text
);
--> statement-breakpoint
CREATE UNIQUE INDEX "access_logs_login_session_uq" ON "access_logs" ("session_id") WHERE "action" = 'login';--> statement-breakpoint
CREATE INDEX "access_logs_at_idx" ON "access_logs" ("at");--> statement-breakpoint
-- 위·변조 방지 (안전성 확보조치 기준 제8조③): 수정 금지, 보관 기간(선수 1년·코치 2년) 전 삭제 금지
CREATE FUNCTION access_logs_guard() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 'access_logs: 수정할 수 없습니다';
  END IF;
  IF TG_OP = 'TRUNCATE' THEN
    RAISE EXCEPTION 'access_logs: 일괄 삭제할 수 없습니다';
  END IF;
  IF OLD.at > now() - (CASE WHEN OLD.actor_role = 'coach' THEN interval '2 years' ELSE interval '1 year' END) THEN
    RAISE EXCEPTION 'access_logs: 보관 기간이 지나지 않은 기록은 삭제할 수 없습니다';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
CREATE TRIGGER access_logs_no_update BEFORE UPDATE OR DELETE ON "access_logs" FOR EACH ROW EXECUTE FUNCTION access_logs_guard();--> statement-breakpoint
CREATE TRIGGER access_logs_no_truncate BEFORE TRUNCATE ON "access_logs" FOR EACH STATEMENT EXECUTE FUNCTION access_logs_guard();
