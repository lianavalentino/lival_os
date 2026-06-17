import { assertEquals } from "jsr:@std/assert";
import { createServiceClient } from "./supabase.ts";

Deno.test("createServiceClient: returns a client exposing from()", () => {
  const client = createServiceClient("https://x.supabase.co", "fake-key");
  assertEquals(typeof client.from, "function");
});
