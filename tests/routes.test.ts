import { test } from "node:test";
import assert from "node:assert/strict";
import { isPublicPath, safeNextPath } from "../lib/routes.ts";

test("public paths", () => {
  for (const p of ["/login", "/no-access", "/not-configured", "/auth/callback", "/auth/denied"]) {
    assert.equal(isPublicPath(p), true, p);
  }
  for (const p of ["/", "/storage", "/login/x", "/authx", "/api/cron/keepalive"]) {
    assert.equal(isPublicPath(p), false, p);
  }
});

test("safeNextPath keeps same-origin app paths", () => {
  assert.equal(safeNextPath("/"), "/");
  assert.equal(safeNextPath("/storage"), "/storage");
  assert.equal(safeNextPath("/box/1?tab=a#x"), "/box/1?tab=a#x");
});

test("safeNextPath rejects open redirects and junk", () => {
  for (const bad of [
    null,
    undefined,
    "",
    "https://evil.example",
    "//evil.example",
    "/\\evil.example",
    "javascript:alert(1)",
    "storage",
    "/ok\nSet-Cookie: x",
  ]) {
    assert.equal(safeNextPath(bad), "/", String(bad));
  }
});

test("safeNextPath avoids redirect loops to public pages", () => {
  assert.equal(safeNextPath("/login"), "/");
  assert.equal(safeNextPath("/login?next=/x"), "/");
  assert.equal(safeNextPath("/auth/callback"), "/");
  assert.equal(safeNextPath("/no-access"), "/");
});
