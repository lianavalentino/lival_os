import { createTimeEntryHandler, type TimeEntryRow } from "./handler.ts";
import { readEnv } from "../_shared/env.ts";
import { createServiceClient } from "../_shared/supabase.ts";

const env = readEnv((k) => Deno.env.get(k));
const client = createServiceClient(env.supabaseUrl, env.serviceRoleKey);

const handler = createTimeEntryHandler({
  secret: env.secret,
  userId: env.userId,
  db: {
    async findByExternalRef(userId: string, ref: string) {
      const { data, error } = await client
        .from("time_entries")
        .select("id, duration_minutes")
        .eq("user_id", userId)
        .eq("external_ref", ref)
        .maybeSingle();
      if (error) throw error;
      return data ? { id: data.id as string, duration_minutes: data.duration_minutes as number } : null;
    },
    async insertTimeEntry(row: TimeEntryRow) {
      const { data, error } = await client
        .from("time_entries")
        .insert(row)
        .select("id")
        .single();
      if (error) throw error;
      return { id: data.id as string };
    },
    async updateDuration(id: string, durationMinutes: number) {
      const { data, error } = await client
        .from("time_entries")
        .update({ duration_minutes: durationMinutes })
        .eq("id", id)
        .select("id")
        .single();
      if (error) throw error;
      return { id: data.id as string };
    },
  },
});

Deno.serve(handler);
