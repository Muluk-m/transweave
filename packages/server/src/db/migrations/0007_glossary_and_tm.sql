CREATE TABLE "glossary_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid,
	"project_id" uuid,
	"source_term" text NOT NULL,
	"translations" jsonb NOT NULL,
	"description" text,
	"case_sensitive" boolean DEFAULT false NOT NULL,
	"do_not_translate" boolean DEFAULT false NOT NULL,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "translation_memory" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"source_language" text NOT NULL,
	"target_language" text NOT NULL,
	"source_text" text NOT NULL,
	"target_text" text NOT NULL,
	"token_id" uuid,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "enable_cross_project_tm" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "glossary_entries" ADD CONSTRAINT "glossary_entries_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "glossary_entries" ADD CONSTRAINT "glossary_entries_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "glossary_entries" ADD CONSTRAINT "glossary_entries_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "translation_memory" ADD CONSTRAINT "translation_memory_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "translation_memory" ADD CONSTRAINT "translation_memory_token_id_tokens_id_fk" FOREIGN KEY ("token_id") REFERENCES "public"."tokens"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "translation_memory" ADD CONSTRAINT "translation_memory_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "glossary_team_id_idx" ON "glossary_entries" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "glossary_project_id_idx" ON "glossary_entries" USING btree ("project_id");--> statement-breakpoint
CREATE UNIQUE INDEX "glossary_scope_term_unique" ON "glossary_entries" USING btree ("team_id","project_id","source_term");--> statement-breakpoint
CREATE INDEX "tm_project_langs_idx" ON "translation_memory" USING btree ("project_id","source_language","target_language");--> statement-breakpoint
CREATE UNIQUE INDEX "tm_project_source_unique" ON "translation_memory" USING btree ("project_id","source_language","target_language","source_text");