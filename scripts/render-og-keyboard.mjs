/**
 * Capture the existing homepage shader with an OG-specific camera and soft mask.
 * Start `pnpm dev`, then run:
 * node scripts/render-og-keyboard.mjs [absolute path to playwright/index.mjs]
 * Playwright is an authoring-only prerequisite, not a production dependency.
 * The original Blender asset and its render script are kept as an alternative.
 */
import { pathToFileURL } from "node:url";
import sharp from "sharp";
import { mkdir } from "node:fs/promises";

const { chromium } = await import(process.argv[2] ? pathToFileURL(process.argv[2]).href : "playwright");
const origin = process.env.OG_CAPTURE_ORIGIN ?? "http://localhost:5173";

const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--enable-unsafe-webgpu"] });
try {
  const page = await browser.newPage({
    viewport: { width: 1200, height: 630 },
    deviceScaleFactor: 1,
    colorScheme: "dark",
  });
  await page.addInitScript(() => localStorage.setItem("theme", "dark"));
  await page.goto(origin, { waitUntil: "domcontentloaded" });
  const backgroundColor = await page.evaluate(async () => {
    const { mount } = await import("/node_modules/.vite/deps/svelte.js");
    await import("/node_modules/.vite/deps/pixi__js_unsafe-eval.js");
    const { default: Keyboard } = await import("/src/lib/features/hero/components/KeycapLogo.svelte");
    const { portfolio } = await import("/src/portfolio/config.ts");
    const { cssColorToHex } = await import("/src/lib/utils/color.ts");
    const styles = getComputedStyle(document.documentElement);
    const colors = {
      backgroundColor: cssColorToHex(styles.getPropertyValue("--background"), "#161619"),
      keyColor: cssColorToHex(styles.getPropertyValue("--card-dark"), "#1c1c1f"),
      logoColor: cssColorToHex(styles.getPropertyValue("--primary"), "#9084ff"),
      legendColor: "#ffffff",
      lightColor: "#ffffff",
    };
    const target = document.createElement("div");
    target.id = "og-keyboard-capture";
    target.style.cssText = "position:fixed;inset:0;width:1200px;height:630px;z-index:2147483647;background:#161619";
    document.body.append(target);
    mount(Keyboard, {
      target,
      props: {
        ...portfolio.hero.shader,
        ...colors,
        scale: 0.8,
        offsetX: 0.26,
        offsetY: 0,
        panX: 0,
        panY: 0,
        interactive: false,
        maxDpr: 1,
        onReady: () => {
          target.dataset.ready = "true";
        },
        onError: (error) => {
          target.dataset.error = error.message;
        },
      },
    });
    return colors.backgroundColor;
  });
  await page.waitForFunction(
    () => {
      const state = document.querySelector("#og-keyboard-capture")?.dataset;
      return state?.ready || state?.error;
    },
    undefined,
    { timeout: 60000 },
  );
  const error = await page.locator("#og-keyboard-capture").getAttribute("data-error");
  if (error) throw new Error(error);
  const capture = await page.locator("#og-keyboard-capture canvas").screenshot();

  // A broad elliptical falloff follows the key rather than revealing the image
  // behind a vertical curtain. The top/bottom tapers only close the canvas edges.
  const smooth = (start, end, value) => {
    const t = Math.max(0, Math.min(1, (value - start) / (end - start)));
    return t * t * t * (t * (t * 6 - 15) + 10);
  };
  const width = 1200,
    height = 630;
  const mask = new Float64Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dx = (x - 1070) / 510;
      const dy = (y - 240) / 310;
      const radius = Math.hypot(dx, dy);
      const bloom = Math.exp(-2 * radius ** 2.5);
      // A second soft field keeps neighboring key legends out of the title area
      // without reintroducing a straight vertical boundary.
      const titleDistance = Math.hypot((x - 420) / 330, (y - 490) / 180);
      const titleClearance = 1 - Math.exp(-(titleDistance ** 4));
      const alpha = bloom * titleClearance * smooth(0, 180, y) * (1 - smooth(420, 630, y));
      mask[y * width + x] = alpha;
    }
  }
  const background = backgroundColor.match(/[a-f0-9]{2}/gi).map((channel) => Number.parseInt(channel, 16));
  const source = await sharp(capture).removeAlpha().raw().toBuffer();
  await mkdir(new URL("../src/lib/seo/assets/", import.meta.url), { recursive: true });

  // Composite in floating point before the ONLY quantization step. Rounding an
  // alpha mask first creates bands that survive even in lossless PNGs.
  for (const [filename, opacity] of [
    ["keyboard-studio.png", 1],
    ["keyboard-studio-article.png", 0.65],
  ]) {
    const pixels = Buffer.alloc(width * height * 3);
    let seed = 0x6a09e667;
    for (let pixel = 0; pixel < width * height; pixel++) {
      // Deterministic stochastic rounding: less than one code value of error,
      // shared across RGB to avoid colored speckles. No decorative grain.
      seed ^= seed << 13;
      seed ^= seed >>> 17;
      seed ^= seed << 5;
      const threshold = (seed >>> 0) / 4294967296;
      const alpha = mask[pixel] * opacity;
      for (let channel = 0; channel < 3; channel++) {
        const index = pixel * 3 + channel;
        const value = background[channel] + (source[index] - background[channel]) * alpha;
        pixels[index] = Math.max(0, Math.min(255, Math.floor(value + threshold)));
      }
    }
    const destination = new URL(`../src/lib/seo/assets/${filename}`, import.meta.url);
    await sharp(pixels, { raw: { width, height, channels: 3 } })
      .png()
      .toFile(destination.pathname);
    console.log(`Rendered ${destination.pathname}`);
  }
} finally {
  await browser.close();
}
