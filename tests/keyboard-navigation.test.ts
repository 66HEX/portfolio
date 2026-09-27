import assert from "node:assert/strict";
import { test } from "node:test";
import { getContributionFocusIndex } from "../src/lib/features/github/utils/keyboard-navigation.ts";
import { getMarqueePhase } from "../src/lib/features/tweets/marquee.ts";

test("contribution arrows follow visual days and weeks without wrapping at edges", () => {
  assert.equal(getContributionFocusIndex(10, 2, 24, "ArrowLeft"), 3);
  assert.equal(getContributionFocusIndex(10, 2, 24, "ArrowRight"), 17);
  assert.equal(getContributionFocusIndex(10, 2, 24, "ArrowUp"), 9);
  assert.equal(getContributionFocusIndex(10, 2, 24, "ArrowDown"), 11);
  assert.equal(getContributionFocusIndex(7, 2, 24, "ArrowUp"), 7);
  assert.equal(getContributionFocusIndex(13, 2, 24, "ArrowDown"), 13);
  assert.equal(getContributionFocusIndex(2, 2, 24, "ArrowUp"), 2);
  assert.equal(getContributionFocusIndex(2, 2, 24, "ArrowLeft"), 2);
  assert.equal(getContributionFocusIndex(24, 2, 24, "ArrowRight"), 24);
  assert.equal(getContributionFocusIndex(24, 2, 24, "ArrowDown"), 24);
});

test("Home and End skip calendar padding while preserving the weekday", () => {
  assert.equal(getContributionFocusIndex(14, 2, 24, "Home"), 7);
  assert.equal(getContributionFocusIndex(14, 2, 24, "End"), 21);
  assert.equal(getContributionFocusIndex(13, 2, 24, "Home"), 6);
  assert.equal(getContributionFocusIndex(13, 2, 24, "End"), 20);
  assert.equal(getContributionFocusIndex(14, 2, 24, "Home", true), 2);
  assert.equal(getContributionFocusIndex(14, 2, 24, "End", true), 24);
  assert.equal(getContributionFocusIndex(14, 2, 24, "Tab"), null);
  assert.equal(getContributionFocusIndex(14, 2, 24, "Escape"), null);
});

test("both marquee directions preserve the visible cycle and keep the viewport filled at the seam", () => {
  const cycleWidth = 1104;
  const trackWidth = cycleWidth * 3 - 16;
  const viewportWidth = 634;
  for (const direction of ["left", "right"] as const) {
    for (const offset of [0, 20, -20, -1104, -2208, -2576, 10_000, -10_000]) {
      const phase = getMarqueePhase(offset, cycleWidth, direction);
      assert.ok(phase >= 0 && phase < 1);
      const normalized = direction === "left" ? -cycleWidth * (1 + phase) : -cycleWidth * (2 - phase);
      const cycles = (normalized - offset) / cycleWidth;
      assert.ok(Math.abs(cycles - Math.round(cycles)) < 1e-10, "normalization must preserve the visible content");
      assert.ok(normalized <= 0);
      assert.ok(normalized + trackWidth >= viewportWidth, "the track must cover the far viewport edge");
    }
  }
});
