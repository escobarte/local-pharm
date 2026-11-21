import { test } from "node:test";
import assert from "node:assert/strict";
import { isAuthorizedCronRequest } from "../lib/cron-auth.ts";

test("accepts exact Bearer secret", () => {
  assert.equal(isAuthorizedCronRequest("Bearer s3cret-value", "s3cret-value"), true);
});

test("denies when secret is not configured", () => {
  assert.equal(isAuthorizedCronRequest("Bearer ", ""), false);
  assert.equal(isAuthorizedCronRequest("Bearer undefined", undefined), false);
  assert.equal(isAuthorizedCronRequest("Bearer null", null), false);
});

test("denies missing or malformed header", () => {
  assert.equal(isAuthorizedCronRequest(null, "abc"), false);
  assert.equal(isAuthorizedCronRequest(undefined, "abc"), false);
  assert.equal(isAuthorizedCronRequest("", "abc"), false);
  assert.equal(isAuthorizedCronRequest("abc", "abc"), false);
  assert.equal(isAuthorizedCronRequest("bearer abc", "abc"), false);
  assert.equal(isAuthorizedCronRequest("Basic abc", "abc"), false);
});

test("denies wrong secret, including prefix/suffix variants", () => {
  assert.equal(isAuthorizedCronRequest("Bearer abd", "abc"), false);
  assert.equal(isAuthorizedCronRequest("Bearer ab", "abc"), false);
  assert.equal(isAuthorizedCronRequest("Bearer abcd", "abc"), false);
  assert.equal(isAuthorizedCronRequest("Bearer abc ", "abc"), false);
});
