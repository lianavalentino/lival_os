import { z } from "npm:zod@3";
import { verifyBearer } from "../_shared/auth.ts";
import { handlePreflight, jsonResponse } from "../_shared/cors.ts";

export const quickCaptureSchema = z.object({
  title: z.string().min(1),
  body: z.string().optional(),
  type: z.enum(["email", "appointment", "idea", "resource", "note", "task", "other"]).default("note"),
  source: z.string().default("shortcut"),
  source_url: z.string().optional(),
  received_at: z.string().datetime().optional(),
});

export type QuickCaptureInput = z.infer<typeof quickCaptureSchema>;

export interface InboxRow {
  user_id: string;
  title: string;
  body: string | null;
  type: string;
  source: string;
  source_url: string | null;
  received_at?: string;
  status: "new";
}

export function toInboxRow(input: QuickCaptureInput, userId: string): InboxRow {
  return {
    user_id: userId,
    title: input.title,
    body: input.body ?? null,
    type: input.type,
    source: input.source,
    source_url: input.source_url ?? null,
    ...(input.received_at ? { received_at: input.received_at } : {}),
    status: "new",
  };
}

export interface QuickCaptureDb {
  insertInboxItem(row: InboxRow): Promise<{ id: string; status: string }>;
}

export interface QuickCaptureDeps {
  secret: string;
  userId: string;
  db: QuickCaptureDb;
}

export function createQuickCaptureHandler(deps: QuickCaptureDeps) {
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
    const parsed = quickCaptureSchema.safeParse(json);
    if (!parsed.success) {
      return jsonResponse({ error: "validation", issues: parsed.error.issues }, 400);
    }
    try {
      const result = await deps.db.insertInboxItem(toInboxRow(parsed.data, deps.userId));
      return jsonResponse({ id: result.id, status: result.status }, 201);
    } catch (e) {
      console.error("ingest-quick-capture insert failed:", e);
      return jsonResponse({ error: "internal" }, 500);
    }
  };
}
