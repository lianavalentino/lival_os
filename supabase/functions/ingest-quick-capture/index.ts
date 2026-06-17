import { createQuickCaptureHandler, type InboxRow } from "./handler.ts";
import { readEnv } from "../_shared/env.ts";
import { createServiceClient } from "../_shared/supabase.ts";

const env = readEnv((k) => Deno.env.get(k));
const client = createServiceClient(env.supabaseUrl, env.serviceRoleKey);

const handler = createQuickCaptureHandler({
  secret: env.secret,
  userId: env.userId,
  db: {
    async insertInboxItem(row: InboxRow) {
      const { data, error } = await client
        .from("inbox_items")
        .insert(row)
        .select("id, status")
        .single();
      if (error) throw error;
      return { id: data.id as string, status: data.status as string };
    },
  },
});

Deno.serve(handler);
