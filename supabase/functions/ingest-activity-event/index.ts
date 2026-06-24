import { createActivityEventHandler, type ActivityEventRow } from "./handler.ts";
import { readEnv } from "../_shared/env.ts";
import { createServiceClient } from "../_shared/supabase.ts";

const env = readEnv((k) => Deno.env.get(k));
const client = createServiceClient(env.supabaseUrl, env.serviceRoleKey);

const handler = createActivityEventHandler({
  secret: env.secret,
  userId: env.userId,
  db: {
    async insertActivityEvent(row: ActivityEventRow) {
      const { data, error } = await client
        .from("activity_events")
        .insert(row)
        .select("id")
        .single();
      if (error) throw error;
      return { id: data.id as string };
    },
  },
});

Deno.serve(handler);
