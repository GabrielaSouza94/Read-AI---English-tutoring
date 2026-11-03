/**
 * D1 schema (TRD §5.1). Drizzle Kit turns changes here into SQL migrations: `npm run db:generate`.
 *
 * Every table that holds a participant's data reaches `participants` through ON DELETE CASCADE, so
 * deleting a participant (retention job or erasure request) removes all of their rows.
 * Timestamps are Unix milliseconds. JSON columns hold arrays or objects as text.
 */
import { sql } from "drizzle-orm";
import {
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

const timestamp = (name: string) => integer(name, { mode: "timestamp_ms" });
const createdAt = () =>
  timestamp("created_at")
    .notNull()
    .default(sql`(unixepoch('subsec') * 1000)`);
const flag = (name: string) => integer(name, { mode: "boolean" }).notNull().default(false);
const json = <T>(name: string) => text(name, { mode: "json" }).$type<T>();

export const REVIEW_STATUSES = ["auto", "needs_review", "reviewed"] as const;
export const STEP_TYPES = ["progressive", "full_story"] as const;

export const tests = sqliteTable("tests", {
  id: integer("id").primaryKey(),
  title: text("title").notNull(),
  level: integer("level").notNull(),
  cefr: text("cefr").notNull(),
  fluencyThreshold: real("fluency_threshold").notNull(), // WCPM
  accuracyThreshold: real("accuracy_threshold").notNull(),
  fluencyScoreThreshold: real("fluency_score_threshold").notNull(),
  maxAttemptsPerStep: integer("max_attempts_per_step").notNull(),
  mismatchAccuracyGap: real("mismatch_accuracy_gap").notNull(), // points
  mismatchWcpmPct: real("mismatch_wcpm_pct").notNull(), // percent of the larger WCPM
});

export const sentences = sqliteTable(
  "sentences",
  {
    id: integer("id").primaryKey(),
    testId: integer("test_id")
      .notNull()
      .references(() => tests.id),
    content: text("content").notNull(),
    sequenceNumber: integer("sequence_number").notNull(),
  },
  (t) => [uniqueIndex("sentences_test_sequence_unique").on(t.testId, t.sequenceNumber)],
);

export const participants = sqliteTable(
  "participants",
  {
    id: text("id").primaryKey(),
    displayName: text("display_name").notNull(),
    code: text("code").notNull(),
    browserId: text("browser_id").notNull(),
    consentAt: timestamp("consent_at").notNull(),
    ipHash: text("ip_hash").notNull(),
    hidden: flag("hidden"),
    seeded: flag("seeded"),
    createdAt: createdAt(),
    deleteAfter: timestamp("delete_after").notNull(),
  },
  (t) => [
    uniqueIndex("participants_display_name_code_unique").on(t.displayName, t.code),
    index("participants_delete_after_idx").on(t.deleteAfter),
    index("participants_browser_id_idx").on(t.browserId),
  ],
);

export const attempts = sqliteTable(
  "attempts",
  {
    id: text("id").primaryKey(),
    participantId: text("participant_id")
      .notNull()
      .references(() => participants.id, { onDelete: "cascade" }),
    testId: integer("test_id")
      .notNull()
      .references(() => tests.id),
    stepNumber: integer("step_number").notNull(),
    attemptNumber: integer("attempt_number").notNull(),
    paragraphReadNumber: integer("paragraph_read_number"),
    deepgramTranscript: text("deepgram_transcript"),
    deepgramWcpm: real("deepgram_wcpm"),
    deepgramAccuracy: real("deepgram_accuracy"),
    deepgramConfidence: real("deepgram_confidence"),
    deepgramFluency: real("deepgram_fluency"),
    azureWcpm: real("azure_wcpm"),
    azureAccuracy: real("azure_accuracy"),
    azureFluency: real("azure_fluency"),
    azureCompleteness: real("azure_completeness"),
    azureProsody: real("azure_prosody"),
    azureMiscues: json<unknown[]>("azure_miscues"),
    deepgramFeedback: text("deepgram_feedback"),
    azureFeedback: text("azure_feedback"),
    highlightedWords: json<string[]>("highlighted_words"),
    flags: json<string[]>("flags"),
    passed: flag("passed"),
    providerError: text("provider_error"),
    durationMs: integer("duration_ms"),
    createdAt: createdAt(),
  },
  (t) => [index("attempts_participant_test_step_idx").on(t.participantId, t.testId, t.stepNumber)],
);

export const attemptStep = sqliteTable("attempt_step", {
  id: text("id").primaryKey(),
  attemptId: text("attempt_id")
    .notNull()
    .references(() => attempts.id, { onDelete: "cascade" }),
  sentenceId: integer("sentence_id")
    .notNull()
    .references(() => sentences.id),
  stepType: text("step_type", { enum: STEP_TYPES }).notNull(),
  wordsSkipped: json<string[]>("words_skipped"),
  wordsAdded: json<string[]>("words_added"),
  wordsHighlighted: json<string[]>("words_highlighted"),
});

export const attemptStt = sqliteTable(
  "attempt_stt",
  {
    attemptId: text("attempt_id")
      .notNull()
      .references(() => attempts.id, { onDelete: "cascade" }),
    rawDeepgram: text("raw_deepgram"),
    rawAzure: text("raw_azure"),
    rawGemini: text("raw_gemini"),
  },
  (t) => [primaryKey({ columns: [t.attemptId] })],
);

export const testResults = sqliteTable(
  "test_results",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    participantId: text("participant_id")
      .notNull()
      .references(() => participants.id, { onDelete: "cascade" }),
    testId: integer("test_id")
      .notNull()
      .references(() => tests.id),
    groupCode: text("group_code"),
    aiWcpm: real("ai_wcpm"),
    aiAccuracy: real("ai_accuracy"),
    aiFluency: real("ai_fluency"),
    finalWcpm: real("final_wcpm"),
    finalAccuracy: real("final_accuracy"),
    finalFluency: real("final_fluency"),
    // Null while the test is in progress; set on finalize.
    reviewStatus: text("review_status", { enum: REVIEW_STATUSES }),
    flagReasons: json<string[]>("flag_reasons"),
    agreementScore: real("agreement_score"),
    aiFeedbackDeepgram: text("ai_feedback_deepgram"),
    aiFeedbackAzure: text("ai_feedback_azure"),
    finalizedAt: timestamp("finalized_at"),
  },
  (t) => [index("test_results_review_status_finalized_idx").on(t.reviewStatus, t.finalizedAt)],
);

export const testStepResult = sqliteTable("test_step_result", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  testResultsId: integer("test_results_id")
    .notNull()
    .references(() => testResults.id, { onDelete: "cascade" }),
  sentenceId: integer("sentence_id")
    .notNull()
    .references(() => sentences.id),
  paragraphReadNumber: integer("paragraph_read_number"),
  stepType: text("step_type", { enum: STEP_TYPES }).notNull(),
  attempts: integer("attempts").notNull(),
  metricsJson: json<Record<string, unknown>>("metrics_json"),
});

export const reviewEvents = sqliteTable("review_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  testResultsId: integer("test_results_id")
    .notNull()
    .references(() => testResults.id, { onDelete: "cascade" }),
  reviewerName: text("reviewer_name").notNull(),
  trusted: flag("trusted"),
  oldValues: json<Record<string, unknown>>("old_values"),
  newValues: json<Record<string, unknown>>("new_values"),
  note: text("note"),
  ipHash: text("ip_hash").notNull(),
  createdAt: createdAt(),
  revertedAt: timestamp("reverted_at"),
});

export const admins = sqliteTable("admins", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
});

export const usageDaily = sqliteTable("usage_daily", {
  date: text("date").primaryKey(), // YYYY-MM-DD (UTC)
  sttMinutes: real("stt_minutes").notNull().default(0),
  testsStarted: integer("tests_started").notNull().default(0),
  paused: flag("paused"),
});
