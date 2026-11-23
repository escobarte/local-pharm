import { test } from "node:test";
import assert from "node:assert/strict";
import { readSupabaseEnv } from "../lib/env.ts";

const URL_OK = "https://project.supabase.example";

test("returns config when both values are present", () => {
  assert.deepEqual(
    readSupabaseEnv({ NEXT_PUBLIC_SUPABASE_URL: URL_OK, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "pk" }),
    { url: URL_OK, publishableKey: "pk" },
  );
});

test("trims whitespace (pasted values)", () => {
  assert.deepEqual(
    readSupabaseEnv({ NEXT_PUBLIC_SUPABASE_URL: ` ${URL_OK}\n`, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: " pk " }),
    { url: URL_OK, publishableKey: "pk" },
  );
});

test("returns null when missing, blank or invalid", () => {
  assert.equal(readSupabaseEnv({}), null);
  assert.equal(readSupabaseEnv({ NEXT_PUBLIC_SUPABASE_URL: URL_OK }), null);
  assert.equal(readSupabaseEnv({ NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "pk" }), null);
  assert.equal(readSupabaseEnv({ NEXT_PUBLIC_SUPABASE_URL: "  ", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "pk" }), null);
  assert.equal(readSupabaseEnv({ NEXT_PUBLIC_SUPABASE_URL: "not a url", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "pk" }), null);
  assert.equal(readSupabaseEnv({ NEXT_PUBLIC_SUPABASE_URL: "ftp://x.example", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "pk" }), null);
});

test("readOpenFdaUrl: optional override, invalid values fall back", async () => {
  const { readOpenFdaUrl } = await import("../lib/env.ts");
  const d = "https://api.fda.gov/drug/label.json";
  assert.equal(readOpenFdaUrl(undefined, d), d);
  assert.equal(readOpenFdaUrl("  ", d), d);
  assert.equal(readOpenFdaUrl("http://127.0.0.1:54360/drug/label.json", d), "http://127.0.0.1:54360/drug/label.json");
  assert.equal(readOpenFdaUrl("javascript:alert(1)", d), d);
  assert.equal(readOpenFdaUrl("not a url", d), d);
});
