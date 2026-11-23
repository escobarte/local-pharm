import { test } from "node:test";
import assert from "node:assert/strict";
import { addPageHref, parseOpenFdaPick } from "../lib/add-href.ts";

test("addPageHref: modes, defaults and what each tab keeps", () => {
  assert.equal(addPageHref({}), "/add");
  assert.equal(addPageHref({ mode: "manual", q: "x", reg: "1", box: "b" }), "/add?box=b");
  assert.equal(addPageHref({ mode: "search" }), "/add?mode=search");
  assert.equal(
    addPageHref({ mode: "search", q: "но-шпа", reg: "0908900192", cell: "c" }),
    "/add?mode=search&q=%D0%BD%D0%BE-%D1%88%D0%BF%D0%B0&reg=0908900192&cell=c",
  );
  assert.equal(addPageHref({ mode: "scan", code: "5995327132174", bc: "1", dup: true }), "/add?mode=scan&code=5995327132174");
  assert.equal(addPageHref({ mode: "manual", bc: "5995327132174", dup: true }), "/add?bc=5995327132174&dup=1");
  assert.equal(addPageHref({ mode: "search", bc: "59411093", notFound: true }), "/add?mode=search&bc=59411093&nf=1");
  assert.equal(addPageHref({ mode: "manual", notFound: true }), "/add");
});

test("openFDA pick round-trips through the URL and is cleaned", () => {
  const pick = { name: "Advil", inn: "Ibuprofen", form: "tablet", strength: "200 mg", manufacturer: null };
  const url = new URL(addPageHref({ mode: "search", q: "advil", fda: pick }), "http://x");
  assert.equal(url.searchParams.get("fn"), "Advil");
  assert.equal(url.searchParams.has("fm"), false);
  assert.deepEqual(parseOpenFdaPick(Object.fromEntries(url.searchParams)), pick);

  assert.equal(parseOpenFdaPick({}), null);
  assert.equal(parseOpenFdaPick({ fn: "   " }), null);
  const long = parseOpenFdaPick({ fn: ["x".repeat(300), "ignored"], fi: "a\u0000b" });
  assert.equal(long?.name.length, 120);
  assert.equal(long?.inn, "a b");
});
