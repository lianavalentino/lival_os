import { assertEquals } from "jsr:@std/assert";
import { verifyBearer } from "./auth.ts";

Deno.test("verifyBearer: correct secret passes", () => {
  assertEquals(verifyBearer("Bearer s3cret", "s3cret"), true);
});

Deno.test("verifyBearer: wrong secret fails", () => {
  assertEquals(verifyBearer("Bearer nope", "s3cret"), false);
});

Deno.test("verifyBearer: missing header fails", () => {
  assertEquals(verifyBearer(null, "s3cret"), false);
});

Deno.test("verifyBearer: empty secret fails", () => {
  assertEquals(verifyBearer("Bearer ", ""), false);
});

Deno.test("verifyBearer: length mismatch fails fast", () => {
  assertEquals(verifyBearer("Bearer s3cret-extra", "s3cret"), false);
});
