import { z } from "npm:zod@3";
import { verifyBearer } from "../_shared/auth.ts";
import { handlePreflight, jsonResponse } from "../_shared/cors.ts";

export const activityEventSchema = z.object({
  entity_type: z.string().min(1),
  event_type: z.string().min(1),
  message: z.string().min(1),
  entity_id: z.string().uuid().optional(),
  metadata: z.record(z.unknown()).default({}),
});

export type ActivityEventInput = z.infer<typeof activityEventSchema>;

export interface ActivityEventRow {
  user_id: string;
  entity_type: string;
  entity_id: string | null;
  event_type: string;
  message: string;
  metadata: Record<string, unknown>;
}

export function toActivityEventRow(input: ActivityEventInput, userId: string): ActivityEventRow {
  return {
    user_id: userId,
    entity_type: input.entity_type,
    entity_id: input.entity_id ?? null,
    event_type: input.event_type,
    message: input.message,
    metadata: input.metadata,
  };
}

export interface ActivityEventDb {
  insertActivityEvent(row: ActivityEventRow): Promise<{ id: string }>;
}

export interface ActivityEventDeps {
  secret: string;
  userId: string;
  db: ActivityEventDb;
}

export function createActivityEventHandler(deps: ActivityEventDeps) {
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
    const parsed = activityEventSchema.safeParse(json);
    if (!parsed.success) {
      return jsonResponse({ error: "validation", issues: parsed.error.issues }, 400);
    }
    try {
      const result = await deps.db.insertActivityEvent(toActivityEventRow(parsed.data, deps.userId));
      return jsonResponse({ id: result.id }, 201);
    } catch (e) {
      console.error("ingest-activity-event insert failed:", e);
      return jsonResponse({ error: "internal" }, 500);
    }
  };
}
