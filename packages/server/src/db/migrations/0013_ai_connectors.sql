CREATE TABLE IF NOT EXISTS "ai_connectors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scope" varchar(10) NOT NULL,
	"team_id" uuid NOT NULL,
	"project_id" uuid,
	"display_name" varchar(80) NOT NULL,
	"provider" varchar(30) NOT NULL,
	"api_key" text NOT NULL,
	"base_url" varchar(500),
	"enabled_models" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ai_connectors_scope_consistent" CHECK ((scope = 'team' AND project_id IS NULL) OR (scope = 'project' AND project_id IS NOT NULL))
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ai_connectors_team_id_idx" ON "ai_connectors" USING btree ("team_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ai_connectors_project_id_idx" ON "ai_connectors" USING btree ("project_id");
--> statement-breakpoint
ALTER TABLE "ai_connectors" ADD CONSTRAINT "ai_connectors_team_id_fk"
	FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "ai_connectors" ADD CONSTRAINT "ai_connectors_project_id_fk"
	FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "ai_connectors" ADD CONSTRAINT "ai_connectors_created_by_fk"
	FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "default_connector_id" uuid;
--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "default_model" varchar(100);
--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_default_connector_id_fk"
	FOREIGN KEY ("default_connector_id") REFERENCES "public"."ai_connectors"("id") ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "default_connector_id" uuid;
--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "default_model" varchar(100);
--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_default_connector_id_fk"
	FOREIGN KEY ("default_connector_id") REFERENCES "public"."ai_connectors"("id") ON DELETE SET NULL;
