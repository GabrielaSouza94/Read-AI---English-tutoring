-- Reverses 0000_init.sql. EMERGENCY USE ONLY: this deletes every table and all data.
-- Run with: npx wrangler d1 execute DB --config wrangler.jsonc --remote --env <env> --file drizzle/down/0000_init.down.sql
-- Then remove the 0000_init.sql row from the d1_migrations table so the migration can be re-applied.
-- Children before parents, so foreign keys never block a drop.
DROP TABLE IF EXISTS review_events;
DROP TABLE IF EXISTS test_step_result;
DROP TABLE IF EXISTS test_results;
DROP TABLE IF EXISTS attempt_stt;
DROP TABLE IF EXISTS attempt_step;
DROP TABLE IF EXISTS attempts;
DROP TABLE IF EXISTS participants;
DROP TABLE IF EXISTS sentences;
DROP TABLE IF EXISTS tests;
DROP TABLE IF EXISTS admins;
DROP TABLE IF EXISTS usage_daily;
