import { assertEquals, assertThrows } from "jsr:@std/assert";
import { readEnv } from "./env.ts";

const full: Record<string, string> = {
  LIVAL_INGEST_SECRET: "s",
  LIVAL_USER_ID: "u",
  SUPABASE_URL: "https://x.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "k",
};

Deno.test("readEnv: returns all fields when present", () => {
  const env = readEnv((k) => full[k]);
  assertEquals(env, {
    secret: "s",
    userId: "u",
    supabaseUrl: "https://x.supabase.co",
    serviceRoleKey: "k",
  });
});

Deno.test("readEnv: throws listing missing vars", () => {
  assertThrows(
    () => readEnv((k) => (k === "LIVAL_USER_ID" ? undefined : full[k])),
    Error,
    "LIVAL_USER_ID",
  );
});
