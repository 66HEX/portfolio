import assert from "node:assert/strict";
import { test } from "node:test";
import {
  flipKeyframes,
  scaleShadow,
  type Surface,
} from "../src/lib/features/blog/components/markdown/media-transition.ts";
import { decodeImage } from "../src/lib/features/blog/components/markdown/media-readiness.ts";

test("FLIP preserves visible corner radii at both ends and throughout a nonuniform scale", () => {
  const from: Surface = {
    rect: { left: 120, top: 300, width: 320, height: 180 },
    corners: [
      [14, 14],
      [10, 10],
      [8, 8],
      [4, 4],
    ],
    shadow: "none",
  };
  const to: Surface = {
    rect: { left: 20, top: 50, width: 960, height: 600 },
    corners: [
      [20, 20],
      [12, 12],
      [6, 6],
      [2, 2],
    ],
    shadow: "none",
  };
  for (const frame of flipKeyframes(from, to)) {
    const progress = Number(frame.offset);
    const [x, y] = String(frame.transform)
      .match(/scale\(([^)]+)\)/)![1]
      .split(",")
      .map(Number);
    const [rx, ry] = String(frame.borderRadius)
      .split(" / ")
      .map((axis) => axis.split(" ").map(Number.parseFloat));
    for (let corner = 0; corner < 4; corner++) {
      const expected = from.corners[corner][0] * (1 - progress) + to.corners[corner][0] * progress;
      assert.ok(Math.abs(rx[corner] * x - expected) < 1e-9);
      assert.ok(Math.abs(ry[corner] * y - expected) < 1e-9);
    }
  }
});

test("shadow compensation round-trips multiple colored shadows and negative spreads", () => {
  const shadow = "rgba(0, 0, 0, 0.1) 0px 4px 6px -1px, rgb(10, 20, 30) 2px 2px 4px -2px";
  assert.equal(scaleShadow(scaleShadow(shadow, 0.5, 0.5), 2, 2), shadow);
  assert.equal(scaleShadow("none", 2, 2), "none");
});

test("a decode that never resolves cannot hold the interaction indefinitely", async () => {
  const image = { decode: () => new Promise<void>(() => {}) } as HTMLImageElement;
  assert.equal(await decodeImage(image, new AbortController().signal, 5), false);
});

test("an aborted decode stays cancelled even when pixels arrive later", async () => {
  let decoded!: () => void;
  const image = {
    naturalWidth: 100,
    decode: () =>
      new Promise<void>((resolve) => {
        decoded = resolve;
      }),
  } as HTMLImageElement;
  const controller = new AbortController();
  const result = decodeImage(image, controller.signal);
  controller.abort();
  assert.equal(await result, false);
  decoded();
  assert.equal(await result, false);
});

test("decode failures and missing decode support use the live-image fallback", async () => {
  const signal = new AbortController().signal;
  assert.equal(
    await decodeImage({ decode: () => Promise.reject(new Error("invalid image")) } as HTMLImageElement, signal),
    false,
  );
  assert.equal(await decodeImage({} as HTMLImageElement, signal), false);
});
