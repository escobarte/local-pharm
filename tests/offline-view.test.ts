import { test } from "node:test";
import assert from "node:assert/strict";
import { OFFLINE_SAVE_MESSAGE, isBlockedOffline } from "../lib/offline/guard.ts";
import { DEFAULT_VIEW, offlineViewHref, parseOfflineView, viewFromPath } from "../lib/offline/view.ts";

const ORIGINS = ["https://pharm.example"];
const ID = "0b5f3c1e-8a7d-4c2e-9f10-123456789abc";
const CELL = "1b5f3c1e-8a7d-4c2e-9f10-123456789abc";
const view = (path: string) => viewFromPath(path, ORIGINS);

test("an app address opens the matching offline view", () => {
  assert.deepEqual(view("/"), DEFAULT_VIEW);
  assert.equal(view(`/search?q=%D0%B6%D0%B0%D1%80&cat=${ID}`).q, "жар");
  assert.equal(view(`/search?cat=${ID}`).categoryId, ID);
  assert.equal(view(`/medications/${ID}`).medicationId, ID);
  assert.equal(view(`/medications/${ID}/pack/new`).medicationId, ID);
  assert.deepEqual([view("/storage").tab, view("/storage").unavailable], ["boxes", false]);
  assert.equal(view(`/storage/${ID}?cell=${CELL}`).boxId, ID);
  assert.equal(view(`/storage/${ID}?cell=${CELL}`).cellId, CELL);
  assert.equal(view(`/storage?box=${ID}`).boxId, ID);
  assert.equal(view("/storage/new").unavailable, true);
});

test("QR stickers: the camera app, the scan screen and its typed link", () => {
  assert.deepEqual([view(`/q/${ID}`).tab, view(`/q/${ID}`).token], ["boxes", ID]);
  assert.equal(view("/q/junk").token, null);
  assert.deepEqual([view("/storage/scan").tab, view("/storage/scan").scan], ["scan", "qr"]);
  const typed = `/storage/scan?link=${encodeURIComponent(`https://pharm.example/q/${ID}`)}`;
  assert.equal(view(typed).token, ID);
  const foreign = `/storage/scan?link=${encodeURIComponent(`https://evil.example/q/${ID}`)}`;
  assert.deepEqual([view(foreign).tab, view(foreign).token], ["scan", null]);
});

test("the Add screen: barcode search, scanner, otherwise unavailable", () => {
  assert.deepEqual([view("/add?mode=scan").tab, view("/add?mode=scan").scan], ["scan", "barcode"]);
  assert.equal(view("/add?mode=scan&code=4006381333931").q, "4006381333931");
  assert.equal(view("/add?mode=search&q=4006381333931").q, "4006381333931");
  assert.deepEqual([view("/add?mode=search&q=nurofen").q, view("/add?mode=search&q=nurofen").unavailable], ["nurofen", true]);
  assert.equal(view("/add").unavailable, true);
  for (const path of ["/expiry", "/shopping"]) assert.equal(view(path).unavailable, true, path);
});

test("a hostile `from` is the start page", () => {
  for (const bad of ["https://evil.example/storage", "//evil.example", "javascript:alert(1)", "/\\evil", "/offline?x=1"]) {
    assert.deepEqual(view(bad), DEFAULT_VIEW, bad);
  }
  const parsed = parseOfflineView(new URLSearchParams({ tab: "search", from: "//evil.example" }), ORIGINS);
  assert.equal(parsed.from, null);
});

test("URL ↔ view round trip, `from` kept as the way back", () => {
  const start = parseOfflineView(new URLSearchParams({ from: `/storage/${ID}` }), ORIGINS);
  assert.equal(start.boxId, ID);
  const href = offlineViewHref({ tab: "search", q: "жар", medicationId: ID, from: start.from });
  const back = parseOfflineView(new URL(href, "https://pharm.example").searchParams, ORIGINS);
  assert.deepEqual(back, { ...DEFAULT_VIEW, q: "жар", medicationId: ID, from: `/storage/${ID}` });
  const scan = offlineViewHref({ tab: "scan", scan: "barcode" });
  assert.equal(parseOfflineView(new URL(scan, "https://a.b").searchParams, ORIGINS).scan, "barcode");
  // A tab picked on the page wins over what `from` pointed at.
  const picked = offlineViewHref({ tab: "search", from: `/storage/${ID}` });
  assert.equal(parseOfflineView(new URL(picked, "https://a.b").searchParams, ORIGINS).boxId, null);
});

test("offline, only GET forms and dialog forms go through", () => {
  for (const method of [null, "", "post", "POST"]) assert.equal(isBlockedOffline(method, false), true, String(method));
  for (const method of ["get", "GET", "dialog"]) assert.equal(isBlockedOffline(method, false), false, method);
  assert.equal(isBlockedOffline("post", true), false);
  assert.match(OFFLINE_SAVE_MESSAGE, /Нужен интернет, чтобы сохранить/);
});
