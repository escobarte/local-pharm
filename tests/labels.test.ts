import { test } from "node:test";
import assert from "node:assert/strict";
import {
  LABEL_SIZES,
  PAGE_MM,
  labelBox,
  mmToCqw,
  numberFontMm,
  pageCount,
  paginate,
  parseLabelSize,
  sheetLayout,
} from "../lib/labels.ts";

test("sheet sizes: 6 (2 × 3) and 21 (3 × 7) per A4", () => {
  const large = sheetLayout("large");
  const small = sheetLayout("small");
  assert.equal(large.perPage, 6);
  assert.deepEqual([large.cols, large.rows], [2, 3]);
  assert.equal(small.perPage, 21);
  assert.deepEqual([small.cols, small.rows], [3, 7]);
});

const EPS = 0.01;

for (const size of LABEL_SIZES) {
  test(`${size}: every sticker is inside the page, none overlap, QR fits`, () => {
    const l = sheetLayout(size);
    const boxes = Array.from({ length: l.perPage }, (_, i) => labelBox(l, i));
    for (const [i, b] of boxes.entries()) {
      assert.ok(b.x >= 3 && b.y >= 3, `${i}: printers need a margin (${b.x}, ${b.y})`);
      assert.ok(b.x + b.width <= PAGE_MM.width + EPS, `${i}: right edge ${b.x + b.width}`);
      assert.ok(b.y + b.height <= PAGE_MM.height + EPS, `${i}: bottom edge ${b.y + b.height}`);
    }
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i];
        const b = boxes[j];
        const overlap =
          a.x < b.x + b.width - EPS && b.x < a.x + a.width - EPS && a.y < b.y + b.height - EPS && b.y < a.y + a.height - EPS;
        assert.ok(!overlap, `${i} overlaps ${j}`);
      }
    }
    assert.ok(l.qr + 2 * l.padding <= Math.min(l.label.width, l.label.height) + EPS, "QR fits the sticker");
    // Grid is symmetric: the right margin equals the left one.
    const last = boxes[l.cols - 1];
    assert.ok(Math.abs(PAGE_MM.width - (last.x + last.width) - l.margin.left) < 0.1, "symmetric horizontally");
    const bottom = boxes[boxes.length - 1];
    assert.ok(Math.abs(PAGE_MM.height - (bottom.y + bottom.height) - l.margin.top) < 0.1, "symmetric vertically");
  });
}

test("labelBox: row by row, left to right", () => {
  const l = sheetLayout("small");
  assert.deepEqual(labelBox(l, 0), { x: 7.2, y: 15.15, width: 63.5, height: 38.1 });
  assert.deepEqual(labelBox(l, 1), { x: 73.24, y: 15.15, width: 63.5, height: 38.1 });
  assert.deepEqual(labelBox(l, 3), { x: 7.2, y: 53.25, width: 63.5, height: 38.1 });
  assert.equal(labelBox(l, 20).y, 243.75);
  assert.throws(() => labelBox(l, 21));
  assert.throws(() => labelBox(l, -1));
  assert.throws(() => labelBox(l, 1.5));
});

test("paginate / pageCount", () => {
  const items = (n: number) => Array.from({ length: n }, (_, i) => i);
  assert.deepEqual(paginate([], 6), []);
  assert.deepEqual(paginate(items(1), 6), [[0]]);
  assert.deepEqual(paginate(items(6), 6).map((p) => p.length), [6]);
  assert.deepEqual(paginate(items(7), 6).map((p) => p.length), [6, 1]);
  assert.deepEqual(paginate(items(43), 21).map((p) => p.length), [21, 21, 1]);
  assert.deepEqual(paginate(items(13), 6).flat(), items(13), "order kept, nothing lost");
  assert.throws(() => paginate(items(3), 0));
  for (const [n, per, pages] of [[0, 6, 0], [1, 6, 1], [6, 6, 1], [7, 6, 2], [21, 21, 1], [22, 21, 2], [-1, 6, 0]]) {
    assert.equal(pageCount(n, per), pages, `${n}/${per}`);
    if (n >= 0) assert.equal(paginate(items(n), per).length, pages);
  }
});

test("parseLabelSize, mmToCqw, numberFontMm", () => {
  assert.equal(parseLabelSize("small"), "small");
  assert.equal(parseLabelSize("large"), "large");
  for (const v of [undefined, "", "SMALL", "huge", ["small"]]) assert.equal(parseLabelSize(v), "large");
  assert.equal(mmToCqw(210), "100cqw");
  assert.equal(mmToCqw(21), "10cqw");
  assert.equal(mmToCqw(63.5), "30.238cqw");
  assert.ok(numberFontMm("large", 1) > numberFontMm("large", 4));
  assert.ok(numberFontMm("large", 4) > numberFontMm("large", 6));
  assert.ok(numberFontMm("small", 2) < numberFontMm("large", 2));
});
