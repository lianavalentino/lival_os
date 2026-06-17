import { z } from "npm:zod@3";
import { verifyBearer } from "../_shared/auth.ts";
import { handlePreflight, jsonResponse } from "../_shared/cors.ts";

export const timeEntrySchema = z.object({
  started_at: z.string().datetime(),
  ended_at: z.string().datetime().optional(),
  duration_minutes: z.number().int().min(0),
  project_id: z.string().uuid().optional(),
  task_id: z.string().uuid().optional(),
  description: z.string().optional(),
  source: z.enum(["manual", "codex", "claude_code", "shortcut", "imported"]).default("claude_code"),
  external_ref: z.string().optional(),
});

export type TimeEntryInput = z.infer<typeof timeEntrySchema>;

export interface TimeEntryRow {
  user_id: string;
  started_at: string;
  ended_at: string | null;
  duration_minutes: number;
  project_id: string | null;
  task_id: string | null;
  description: string | null;
  source: string;
  external_ref: string | null;
}

export function toTimeEntryRow(input: TimeEntryInput, userId: string): TimeEntryRow {
  return {
    user_id: userId,
    started_at: input.started_at,
    ended_at: input.ended_at ?? null,
    duration_minutes: input.duration_minutes,
    project_id: input.project_id ?? null,
    task_id: input.task_id ?? null,
    description: input.description ?? null,
    source: input.source,
    external_ref: input.external_ref ?? null,
  };
}

export interface TimeEntryDb {
  findByExternalRef(userId: string, ref: string): Promise<{ id: string } | null>;
  insertTimeEntry(row: TimeEntryRow): Promise<{ id: string }>;
}

export interface TimeEntryDeps {
  secret: string;
  userId: string;
  db: TimeEntryDb;
}

export function createTimeEntryHandler(deps: TimeEntryDeps) {
  return async (req: Request): Promise<Response> => {
    const pre = handlePreflight(req);
    if (pre) return pre;
    if (req.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405);
    if (!verifyBearer(req.headers.get("authorization"), deps.secret)) {
      return jsonResponse({ error: "unauthorized" }, 401);
    }
    let json: unknown;
    try {
      json = await req.json();
    } catch {
      return jsonResponse({ error: "validation", issues: ["invalid JSON body"] }, 400);
    }
    const parsed = timeEntrySchema.safeParse(json);
    if (!parsed.success) {
      return jsonResponse({ error: "validation", issues: parsed.error.issues }, 400);
    }
    try {
      if (parsed.data.external_ref) {
        const existing = await deps.db.findByExternalRef(deps.userId, parsed.data.external_ref);
        if (existing) return jsonResponse({ id: existing.id }, 200);
      }
      const result = await deps.db.insertTimeEntry(toTimeEntryRow(parsed.data, deps.userId));
      return jsonResponse({ id: result.id }, 201);
    } catch (e) {
      console.error("ingest-time-entry insert failed:", e);
      return jsonResponse({ error: "internal" }, 500);
    }
  };
}
