CREATE TABLE `admins` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `admins_email_unique` ON `admins` (`email`);--> statement-breakpoint
CREATE TABLE `attempt_step` (
	`id` text PRIMARY KEY NOT NULL,
	`attempt_id` text NOT NULL,
	`sentence_id` integer NOT NULL,
	`step_type` text NOT NULL,
	`words_skipped` text,
	`words_added` text,
	`words_highlighted` text,
	FOREIGN KEY (`attempt_id`) REFERENCES `attempts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`sentence_id`) REFERENCES `sentences`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `attempt_stt` (
	`attempt_id` text PRIMARY KEY NOT NULL,
	`raw_deepgram` text,
	`raw_azure` text,
	`raw_gemini` text,
	FOREIGN KEY (`attempt_id`) REFERENCES `attempts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `attempts` (
	`id` text PRIMARY KEY NOT NULL,
	`participant_id` text NOT NULL,
	`test_id` integer NOT NULL,
	`step_number` integer NOT NULL,
	`attempt_number` integer NOT NULL,
	`paragraph_read_number` integer,
	`deepgram_transcript` text,
	`deepgram_wcpm` real,
	`deepgram_accuracy` real,
	`deepgram_confidence` real,
	`deepgram_fluency` real,
	`azure_wcpm` real,
	`azure_accuracy` real,
	`azure_fluency` real,
	`azure_completeness` real,
	`azure_prosody` real,
	`azure_miscues` text,
	`deepgram_feedback` text,
	`azure_feedback` text,
	`highlighted_words` text,
	`flags` text,
	`passed` integer DEFAULT false NOT NULL,
	`provider_error` text,
	`duration_ms` integer,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	FOREIGN KEY (`participant_id`) REFERENCES `participants`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`test_id`) REFERENCES `tests`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `attempts_participant_test_step_idx` ON `attempts` (`participant_id`,`test_id`,`step_number`);--> statement-breakpoint
CREATE TABLE `participants` (
	`id` text PRIMARY KEY NOT NULL,
	`display_name` text NOT NULL,
	`code` text NOT NULL,
	`browser_id` text NOT NULL,
	`consent_at` integer NOT NULL,
	`ip_hash` text NOT NULL,
	`hidden` integer DEFAULT false NOT NULL,
	`seeded` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	`delete_after` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `participants_display_name_code_unique` ON `participants` (`display_name`,`code`);--> statement-breakpoint
CREATE INDEX `participants_delete_after_idx` ON `participants` (`delete_after`);--> statement-breakpoint
CREATE INDEX `participants_browser_id_idx` ON `participants` (`browser_id`);--> statement-breakpoint
CREATE TABLE `review_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`test_results_id` integer NOT NULL,
	`reviewer_name` text NOT NULL,
	`trusted` integer DEFAULT false NOT NULL,
	`old_values` text,
	`new_values` text,
	`note` text,
	`ip_hash` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	`reverted_at` integer,
	FOREIGN KEY (`test_results_id`) REFERENCES `test_results`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `sentences` (
	`id` integer PRIMARY KEY NOT NULL,
	`test_id` integer NOT NULL,
	`content` text NOT NULL,
	`sequence_number` integer NOT NULL,
	FOREIGN KEY (`test_id`) REFERENCES `tests`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sentences_test_sequence_unique` ON `sentences` (`test_id`,`sequence_number`);--> statement-breakpoint
CREATE TABLE `test_results` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`participant_id` text NOT NULL,
	`test_id` integer NOT NULL,
	`group_code` text,
	`ai_wcpm` real,
	`ai_accuracy` real,
	`ai_fluency` real,
	`final_wcpm` real,
	`final_accuracy` real,
	`final_fluency` real,
	`review_status` text,
	`flag_reasons` text,
	`agreement_score` real,
	`ai_feedback_deepgram` text,
	`ai_feedback_azure` text,
	`finalized_at` integer,
	FOREIGN KEY (`participant_id`) REFERENCES `participants`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`test_id`) REFERENCES `tests`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `test_results_review_status_finalized_idx` ON `test_results` (`review_status`,`finalized_at`);--> statement-breakpoint
CREATE TABLE `test_step_result` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`test_results_id` integer NOT NULL,
	`sentence_id` integer NOT NULL,
	`paragraph_read_number` integer,
	`step_type` text NOT NULL,
	`attempts` integer NOT NULL,
	`metrics_json` text,
	FOREIGN KEY (`test_results_id`) REFERENCES `test_results`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`sentence_id`) REFERENCES `sentences`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `tests` (
	`id` integer PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`level` integer NOT NULL,
	`cefr` text NOT NULL,
	`fluency_threshold` real NOT NULL,
	`accuracy_threshold` real NOT NULL,
	`fluency_score_threshold` real NOT NULL,
	`max_attempts_per_step` integer NOT NULL,
	`mismatch_accuracy_gap` real NOT NULL,
	`mismatch_wcpm_pct` real NOT NULL
);
--> statement-breakpoint
CREATE TABLE `usage_daily` (
	`date` text PRIMARY KEY NOT NULL,
	`stt_minutes` real DEFAULT 0 NOT NULL,
	`tests_started` integer DEFAULT 0 NOT NULL,
	`paused` integer DEFAULT false NOT NULL
);
