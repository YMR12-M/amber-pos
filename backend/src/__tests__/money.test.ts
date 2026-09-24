import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { toPiastres, toEgp, applyRate } from "../utils/money";

describe("money conversion", () => {
  test("converts EGP to piastres exactly", () => {
    assert.equal(toPiastres(0.1), 10);
    assert.equal(toPiastres("65.00"), 6500);
    assert.equal(toPiastres(120.55), 12055);
    assert.equal(toPiastres(0), 0);
  });

  test("round-trips without drift", () => {
    for (const value of [0.1, 0.7, 12.34, 999.99, 65]) {
      assert.equal(toEgp(toPiastres(value)), value);
    }
  });

  test("beats the float bug this replaced", () => {
    // The old code did 0.1 * 3 in floats:
    assert.equal(0.1 * 3, 0.30000000000000004);
    // The integer path is exact:
    assert.equal(toEgp(toPiastres(0.1) * 3), 0.3);
  });

  test("rejects non-numeric input", () => {
    assert.throws(() => toPiastres("abc"));
    assert.throws(() => toPiastres(Infinity));
  });
});

describe("tax application", () => {
  test("rounds to the nearest piastre", () => {
    assert.equal(applyRate(30, 0.14), 4); // 4.2 -> 4
    assert.equal(applyRate(10000, 0.14), 1400);
    assert.equal(applyRate(0, 0.14), 0);
  });

  test("a zero rate adds nothing", () => {
    assert.equal(applyRate(6500, 0), 0);
  });
});
