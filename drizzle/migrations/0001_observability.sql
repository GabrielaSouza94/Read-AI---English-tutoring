CREATE TABLE `admin_audit` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	`admin_id` integer,
	`action` text NOT NULL,
	`target_type` text,
	`target_id` text,
	`details` text,
	`request_id` text
);
--> statement-breakpoint
CREATE INDEX `admin_audit_created_at_idx` ON `admin_audit` (`created_at`);--> statement-breakpoint
CREATE TABLE `metrics_hourly` (
	`hour` text PRIMARY KEY NOT NULL,
	`requests` integer DEFAULT 0 NOT NULL,
	`server_errors` integer DEFAULT 0 NOT NULL,
	`provider_calls` integer DEFAULT 0 NOT NULL,
	`provider_errors` integer DEFAULT 0 NOT NULL
);
