import { expect, test, type Page } from "@playwright/test";

const article = "/blog/designing-the-frame-workspace";
const imageName =
  "View full size: Frame 0.1.0, with the file queue taking most of the window and conversion settings in a narrow panel on the right.";
const videoName = "View full size: Inspector tab selection in Frame 0.34.0";
const floating = "[data-markdown-image-flip], [data-markdown-video-flip]";
const inlineVideo = '[data-motion-video="inline"]';

let errors: string[];
test.beforeEach(async ({ page }) => {
  errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: "no-preference" });
});
test.afterEach(() => expect(errors).toEqual([]));

async function loadArticle(page: Page) {
  await page.goto(article);
  await expect(page.getByRole("button", { name: imageName, exact: true })).toBeAttached();
  await expect
    .poll(() =>
      page
        .locator('[data-slot="markdown-image"]')
        .first()
        .evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0),
    )
    .toBe(true);
}

async function expectClosed(page: Page, name: string) {
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator(floating)).toHaveCount(0);
  await expect(page.getByRole("button", { name, exact: true })).toBeFocused();
  await expect.poll(() => page.evaluate(() => document.body.style.overflow)).not.toBe("hidden");
  await expect.poll(() => page.evaluate(() => document.body.style.pointerEvents)).not.toBe("none");
}

async function slowAnimations(page: Page) {
  await page.addInitScript(() => {
    const animate = Element.prototype.animate;
    Element.prototype.animate = function (frames, options) {
      const media =
        this.hasAttribute("data-markdown-image-flip") ||
        this.hasAttribute("data-markdown-video-flip") ||
        this.hasAttribute("data-dialog-overlay") ||
        this.getAttribute("role") === "dialog";
      return animate.call(
        this,
        frames,
        media && typeof options === "object" ? { ...options, duration: 1200 } : options,
      );
    };
  });
}

test("image modal traps focus, closes from the keyboard and backdrop, and restores scroll", async ({ page }) => {
  await loadArticle(page);
  const trigger = page.getByRole("button", { name: imageName, exact: true });
  await trigger.scrollIntoViewIfNeeded();
  await trigger.focus();
  const scroll = await page.evaluate(() => scrollY);
  await trigger.press("Enter");
  const dialog = page.getByRole("dialog");
  const close = page.getByRole("button", { name: "Close image", exact: true });
  await expect(close).toBeFocused();
  await expect(dialog).toHaveAttribute("data-moving", "false");
  await page.keyboard.press("Tab");
  await expect(close).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(close).toBeFocused();
  await page.keyboard.press("Escape");
  await expectClosed(page, imageName);
  expect(await page.evaluate(() => scrollY)).toBeCloseTo(scroll, 0);
  await trigger.click();
  await expect(dialog).toHaveAttribute("data-moving", "false");
  await page.mouse.click(4, 4);
  await expectClosed(page, imageName);
});

for (const [kind, name] of [
  ["image", imageName],
  ["video", videoName],
] as const) {
  test(`${kind} reverses an opening animation and can reopen without leftover frames`, async ({ page }) => {
    await slowAnimations(page);
    await loadArticle(page);
    const trigger = page.getByRole("button", { name, exact: true });
    await trigger.click();
    await expect(page.locator(floating)).toHaveCount(1);
    await expect(page.getByRole("dialog")).toHaveAttribute("data-moving", "true");
    await page.keyboard.press("Escape");
    await expectClosed(page, name);
    await trigger.click();
    await expect(page.getByRole("dialog")).toHaveAttribute("data-moving", "false");
    await expect(page.locator(floating)).toHaveCount(0);
    await page.keyboard.press("Escape");
    await expectClosed(page, name);
  });
}

test("a stalled image decode has a deadline and leaves a usable modal", async ({ page }) => {
  await page.addInitScript(() => {
    HTMLImageElement.prototype.decode = () => new Promise(() => {});
  });
  await loadArticle(page);
  await page.getByRole("button", { name: imageName, exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveAttribute("data-moving", "false", { timeout: 1000 });
  await expect(page.getByRole("dialog").getByRole("img")).toBeVisible();
  await page.keyboard.press("Escape");
  await expectClosed(page, imageName);
});

test("Escape cancels image preparation before a dialog mounts", async ({ page }) => {
  await page.addInitScript(() => {
    HTMLImageElement.prototype.decode = () => new Promise(() => {});
  });
  await loadArticle(page);
  await page.getByRole("button", { name: imageName, exact: true }).click();
  await page.keyboard.press("Escape");
  // Outlive the decode deadline to catch a stale continuation reopening the dialog.
  await page.waitForTimeout(350);
  await expectClosed(page, imageName);
  await expect(page.locator('[data-slot="markdown-image"]').first()).toBeVisible();
});

test("failed decoding falls back without an unhandled rejection", async ({ page }) => {
  await page.addInitScript(() => {
    HTMLImageElement.prototype.decode = () => Promise.reject(new Error("decode failed"));
  });
  await loadArticle(page);
  await page.getByRole("button", { name: imageName, exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveAttribute("data-moving", "false");
  await page.keyboard.press("Escape");
  await expectClosed(page, imageName);
});

test("resize settles an in-flight morph at the new viewport size", async ({ page }) => {
  await slowAnimations(page);
  await loadArticle(page);
  await page.getByRole("button", { name: imageName, exact: true }).click();
  await expect(page.locator(floating)).toHaveCount(1);
  await page.setViewportSize({ width: 430, height: 740 });
  await expect(page.getByRole("dialog")).toHaveAttribute("data-moving", "false", { timeout: 800 });
  await expect(page.locator(floating)).toHaveCount(0);
  const bounds = await page.getByRole("dialog").getByRole("img").boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.y).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(431);
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(741);
  await page.keyboard.press("Escape");
  await expectClosed(page, imageName);
});

test("changing reduced motion settles a morph and stops video playback", async ({ page }) => {
  await slowAnimations(page);
  await loadArticle(page);
  await page.getByRole("button", { name: videoName, exact: true }).click();
  await expect(page.locator(floating)).toHaveCount(1);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.getByRole("dialog")).toHaveAttribute("data-moving", "false", { timeout: 800 });
  await expect(page.locator(floating)).toHaveCount(0);
  await expect
    .poll(() =>
      page.locator("video").evaluateAll((videos: HTMLVideoElement[]) => videos.every((video) => video.paused)),
    )
    .toBe(true);
  await page.keyboard.press("Escape");
  await expectClosed(page, videoName);
});

test("reduced motion shows a poster while video is stalled and closes immediately", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("**/frame-0.34-tabs-loop.mp4", () => {
    /* Keep the media request pending. */
  });
  await loadArticle(page);
  await page.getByRole("button", { name: videoName, exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toHaveAttribute("data-moving", "false", { timeout: 800 });
  await expect(dialog).toHaveCSS("opacity", "1");
  await expect(dialog.locator("[data-motion-placeholder]")).toBeVisible();
  await expect(page.locator(floating)).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0, { timeout: 800 });
  await expectClosed(page, videoName);
});

test("a stalled video never extends the open or close animation", async ({ page }) => {
  await page.route("**/frame-0.34-tabs-loop.mp4", () => {
    /* Keep the media request pending. */
  });
  await loadArticle(page);
  await page.getByRole("button", { name: videoName, exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveAttribute("data-moving", "false", { timeout: 1000 });
  await expect(page.getByRole("dialog").locator("[data-motion-placeholder]")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0, { timeout: 1000 });
  await expectClosed(page, videoName);
});

test("inline video pauses outside the viewport and in a hidden document, then resumes", async ({ page }) => {
  await loadArticle(page);
  const video = page.locator(inlineVideo).first();
  await video.scrollIntoViewIfNeeded();
  await expect.poll(() => video.evaluate((v: HTMLVideoElement) => !v.paused && v.currentTime > 0)).toBe(true);
  await page.getByRole("button", { name: imageName, exact: true }).scrollIntoViewIfNeeded();
  await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.paused)).toBe(true);
  const stoppedAt = await video.evaluate((v: HTMLVideoElement) => v.currentTime);
  await page.waitForTimeout(200);
  expect(await video.evaluate((v: HTMLVideoElement) => v.currentTime)).toBeCloseTo(stoppedAt, 1);
  await video.scrollIntoViewIfNeeded();
  await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.paused)).toBe(false);
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.paused)).toBe(true);
  await page.evaluate(() => {
    Reflect.deleteProperty(document, "visibilityState");
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.paused)).toBe(false);
});

test("video handoff preserves the frame time in both directions", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await loadArticle(page);
  const inline = page.locator(inlineVideo).first();
  await inline.evaluate((video: HTMLVideoElement) => {
    video.preload = "auto";
    video.load();
  });
  await expect.poll(() => inline.evaluate((video: HTMLVideoElement) => video.readyState)).toBeGreaterThanOrEqual(2);
  await inline.evaluate((video: HTMLVideoElement) => {
    video.currentTime = 1.25;
  });
  await expect.poll(() => inline.evaluate((video: HTMLVideoElement) => video.seeking)).toBe(false);
  await page.getByRole("button", { name: videoName, exact: true }).click();
  const expanded = page.locator('[data-motion-video="expanded"]');
  await expect(page.getByRole("dialog").locator("[data-motion-placeholder]")).toHaveCount(0);
  expect(await expanded.evaluate((video: HTMLVideoElement) => video.currentTime)).toBeCloseTo(1.25, 1);
  await expanded.evaluate((video: HTMLVideoElement) => {
    video.currentTime = 2.5;
  });
  await expect.poll(() => expanded.evaluate((video: HTMLVideoElement) => video.seeking)).toBe(false);
  await page.keyboard.press("Escape");
  await expectClosed(page, videoName);
  await expect(page.locator("[data-motion-placeholder]")).toHaveCount(0);
  expect(await inline.evaluate((video: HTMLVideoElement) => video.currentTime)).toBeCloseTo(2.5, 1);
  expect(await inline.evaluate((video: HTMLVideoElement) => video.paused)).toBe(true);
});

test("closing during a stalled seek releases the dialog and keeps a still until the frame is ready", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await loadArticle(page);
  await page.getByRole("button", { name: videoName, exact: true }).click();
  const expanded = page.locator('[data-motion-video="expanded"]');
  await expect(page.getByRole("dialog").locator("[data-motion-placeholder]")).toHaveCount(0);
  await expanded.evaluate((video: HTMLVideoElement) => {
    video.currentTime = 2;
  });
  await expect.poll(() => expanded.evaluate((video: HTMLVideoElement) => video.seeking)).toBe(false);
  const inline = page.locator(inlineVideo).first();
  await inline.evaluate((video) => Object.defineProperty(video, "seeking", { configurable: true, value: true }));
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0, { timeout: 800 });
  await expectClosed(page, videoName);
  await expect(page.locator("[data-motion-placeholder]")).toBeVisible();
  await expect.poll(() => inline.evaluate((video: HTMLVideoElement) => video.readyState)).toBeGreaterThanOrEqual(2);
  await inline.evaluate((video) => {
    Reflect.deleteProperty(video, "seeking");
    video.dispatchEvent(new Event("seeked"));
  });
  await expect(page.locator("[data-motion-placeholder]")).toHaveCount(0);
  expect(await inline.evaluate((video: HTMLVideoElement) => video.currentTime)).toBeCloseTo(2, 1);
  expect(await inline.evaluate((video: HTMLVideoElement) => video.paused)).toBe(true);
});

test("leaving the article during a morph removes frames, listeners and the scroll lock", async ({ page }) => {
  await slowAnimations(page);
  await loadArticle(page);
  const documentStartedAt = await page.evaluate(() => performance.timeOrigin);
  await page.getByRole("link", { name: "Back to home", exact: true }).click();
  await expect(page).toHaveURL("/");
  await page.goBack();
  await expect(page).toHaveURL(article);
  // This trigger only mounts on the client. Do not click SSR markup before
  // hydration, or mistake a full navigation for component teardown in an SPA.
  await expect(page.getByRole("button", { name: imageName, exact: true })).toBeAttached();
  expect(await page.evaluate(() => performance.timeOrigin)).toBe(documentStartedAt);
  await page.getByRole("button", { name: videoName, exact: true }).click();
  await expect(page.locator(floating)).toHaveCount(1);
  await page.goForward();
  await expect(page).toHaveURL("/");
  expect(await page.evaluate(() => performance.timeOrigin)).toBe(documentStartedAt);
  await expect(page.locator(floating)).toHaveCount(0);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator("[data-motion-placeholder]")).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => document.body.style.overflow)).not.toBe("hidden");
  await expect.poll(() => page.evaluate(() => document.body.style.pointerEvents)).not.toBe("none");
  await page.setViewportSize({ width: 430, height: 740 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.waitForTimeout(1300);
  await expect(page.locator(floating)).toHaveCount(0);
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("the scaled morph keeps the thumbnail's visible corner radius", async ({ page }) => {
  await page.addInitScript(() => {
    const animate = Element.prototype.animate;
    Element.prototype.animate = function (frames, options) {
      const result = animate.call(this, frames, options);
      if (this.hasAttribute("data-markdown-image-flip")) {
        result.pause();
        result.currentTime = 0;
      }
      return result;
    };
  });
  await loadArticle(page);
  await page.getByRole("button", { name: imageName, exact: true }).click();
  const frame = page.locator("[data-markdown-image-flip]");
  await expect(frame).toHaveCount(1);
  const renderedRadius = () =>
    frame.evaluate((element) => {
      const style = getComputedStyle(element);
      const scale = new DOMMatrix(style.transform);
      const [x, y = x] = style.borderTopLeftRadius.split(" ").map(Number.parseFloat);
      return [x * scale.a, y * scale.d];
    });
  const expected = await page
    .locator('[data-slot="markdown-image"]')
    .first()
    .evaluate((image) => Number.parseFloat(getComputedStyle(image).borderTopLeftRadius));
  for (const value of await renderedRadius()) expect(value).toBeCloseTo(expected, 0);
  await frame.evaluate((element) =>
    element.getAnimations().forEach((animation) => {
      animation.currentTime = 150;
    }),
  );
  for (const value of await renderedRadius()) expect(value).toBeCloseTo(expected, 0);
  await frame.evaluate((element) => element.getAnimations().forEach((animation) => animation.finish()));
  await expect(page.getByRole("dialog")).toHaveAttribute("data-moving", "false");
});
