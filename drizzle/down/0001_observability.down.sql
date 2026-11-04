-- Reverses 0001_observability.sql. EMERGENCY USE ONLY: the admin audit trail and hourly counters are lost.
-- Run with: npx wrangler d1 execute DB --config wrangler.jsonc --remote --env <env> --file drizzle/down/0001_observability.down.sql
-- Then remove the 0001_observability.sql row from the d1_migrations table so the migration can be re-applied.
DROP TABLE IF EXISTS admin_audit;
DROP TABLE IF EXISTS metrics_hourly;
