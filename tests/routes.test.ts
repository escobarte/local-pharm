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
  // QR sticker target: back to the same box after sign-in.
  const qr = "/q/0b5f3c1e-8a7d-4c2e-9f10-123456789abc";
  assert.equal(safeNextPath(qr), qr);
  assert.equal(safeNextPath("/storage/labels?box=1&size=small"), "/storage/labels?box=1&size=small");
  // Encoded slashes stay a path on our own host.
  assert.equal(safeNextPath("/%2F%2Fevil.example"), "/%2F%2Fevil.example");
});

test("safeNextPath rejects open redirects and junk", () => {
  for (const bad of [
    null,
    undefined,
    "",
    "https://evil.example",
    "http://evil.example/q/0b5f3c1e-8a7d-4c2e-9f10-123456789abc",
    "//evil.example",
    "///evil.example",
    "\\\\evil.example",
    "\\evil.example",
    "/\\evil.example",
    "/\\/evil.example",
    "/q/x\\..\\..\\evil",
    "javascript:alert(1)",
    "JavaScript:alert(1)",
    " /storage",
    "storage",
    "evil.example/q/x",
    "/ok\nSet-Cookie: x",
    "/ok\tx",
    "/ok\u007f",
    "/" + "a".repeat(1100),
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
