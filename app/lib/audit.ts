/**
 * Admin audit trail (T0.4, UC-3). Every admin action writes one `admin_audit` row. Details pass
 * through `redact()`, so names and IP addresses never reach the table.
 */
import type { ADMIN_ACTIONS } from "../db/schema";
import { redact } from "./log";
import type { D1Like } from "./metrics";

export type AdminAction = (typeof ADMIN_ACTIONS)[number];

export type AuditEntry = {
  action: AdminAction;
  /** Null for a failed login. */
  adminId: number | null;
  targetType?: string;
  targetId?: string | number;
  details?: Record<string, unknown>;
  requestId?: string;
};

export async function recordAdminAction(db: D1Like, entry: AuditEntry): Promise<void> {
  await db
    .prepare(
      `INSERT INTO admin_audit (admin_id, action, target_type, target_id, details, request_id)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6)`,
    )
    .bind(
      entry.adminId,
      entry.action,
      entry.targetType ?? null,
      entry.targetId === undefined ? null : String(entry.targetId),
      entry.details ? JSON.stringify(redact(entry.details)) : null,
      entry.requestId ?? null,
    )
    .run();
}
