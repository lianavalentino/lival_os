import { createFileChangeHandler, type FileChangeRow } from "./handler.ts";
import { readEnv } from "../_shared/env.ts";
import { createServiceClient } from "../_shared/supabase.ts";

const env = readEnv((k) => Deno.env.get(k));
const client = createServiceClient(env.supabaseUrl, env.serviceRoleKey);

const handler = createFileChangeHandler({
  secret: env.secret,
  userId: env.userId,
  db: {
    async insertFileChange(row: FileChangeRow) {
      const { data, error } = await client
        .from("file_changes")
        .insert(row)
        .select("id")
        .single();
      if (error) throw error;
      return { id: data.id as string };
    },
  },
});

Deno.serve(handler);
