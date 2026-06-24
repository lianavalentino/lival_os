import { z } from "npm:zod@3";
import { verifyBearer } from "../_shared/auth.ts";
import { handlePreflight, jsonResponse } from "../_shared/cors.ts";

export const fileChangeSchema = z.object({
  file_path: z.string().min(1),
  change_type: z.enum(["created", "modified", "deleted", "renamed"]).optional(),
  project_id: z.string().uuid().optional(),
  task_id: z.string().uuid().optional(),
  repo_path: z.string().optional(),
  github_url: z.string().optional(),
  summary: z.string().optional(),
  source: z.string().default("claude_code"),
  metadata: z.record(z.unknown()).default({}),
});

export type FileChangeInput = z.infer<typeof fileChangeSchema>;

export interface FileChangeRow {
  user_id: string;
  file_path: string;
  change_type: string | null;
  project_id: string | null;
  task_id: string | null;
  repo_path: string | null;
  github_url: string | null;
  summary: string | null;
  source: string;
  metadata: Record<string, unknown>;
}

export function toFileChangeRow(input: FileChangeInput, userId: string): FileChangeRow {
  return {
    user_id: userId,
    file_path: input.file_path,
    change_type: input.change_type ?? null,
    project_id: input.project_id ?? null,
    task_id: input.task_id ?? null,
    repo_path: input.repo_path ?? null,
    github_url: input.github_url ?? null,
    summary: input.summary ?? null,
    source: input.source,
    metadata: input.metadata,
  };
}

export interface FileChangeDb {
  insertFileChange(row: FileChangeRow): Promise<{ id: string }>;
}

export interface FileChangeDeps {
  secret: string;
  userId: string;
  db: FileChangeDb;
}

export function createFileChangeHandler(deps: FileChangeDeps) {
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
    const parsed = fileChangeSchema.safeParse(json);
    if (!parsed.success) {
      return jsonResponse({ error: "validation", issues: parsed.error.issues }, 400);
    }
    try {
      const result = await deps.db.insertFileChange(toFileChangeRow(parsed.data, deps.userId));
      return jsonResponse({ id: result.id }, 201);
    } catch (e) {
      console.error("ingest-file-change insert failed:", e);
      return jsonResponse({ error: "internal" }, 500);
    }
  };
}
