CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"password" text,
	"avatar" text,
	"email" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"url" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"team_id" uuid NOT NULL,
	"role" varchar(20) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "memberships_user_team_unique" UNIQUE("user_id","team_id")
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"url" text NOT NULL,
	"default_lang" text,
	"team_id" uuid NOT NULL,
	"description" text,
	"languages" jsonb DEFAULT '[]'::jsonb,
	"language_labels" jsonb DEFAULT '{}'::jsonb,
	"modules" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"module" text,
	"translations" jsonb NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"comment" text,
	"screenshots" jsonb DEFAULT '[]'::jsonb,
	"project_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "token_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token_id" uuid NOT NULL,
	"user_id" uuid,
	"translations" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "activity_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" varchar(50) NOT NULL,
	"project_id" uuid NOT NULL,
	"user_id" uuid,
	"details" jsonb,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tokens" ADD CONSTRAINT "tokens_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "token_history" ADD CONSTRAINT "token_history_token_id_tokens_id_fk" FOREIGN KEY ("token_id") REFERENCES "public"."tokens"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "token_history" ADD CONSTRAINT "token_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "memberships_user_id_idx" ON "memberships" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "memberships_team_id_idx" ON "memberships" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "projects_team_id_idx" ON "projects" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "tokens_project_id_idx" ON "tokens" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "tokens_key_idx" ON "tokens" USING btree ("key");--> statement-breakpoint
CREATE INDEX "token_history_token_id_idx" ON "token_history" USING btree ("token_id");--> statement-breakpoint
CREATE INDEX "activity_logs_project_created_idx" ON "activity_logs" USING btree ("project_id","created_at");--> statement-breakpoint
CREATE INDEX "activity_logs_user_created_idx" ON "activity_logs" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "activity_logs_type_created_idx" ON "activity_logs" USING btree ("type","created_at");