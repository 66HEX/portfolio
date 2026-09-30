import layoutCss from "../../routes/layout.css?raw";

type OgThemeColors = {
  background: string;
  foreground: string;
  foregroundMuted: string;
  accent: string;
  border: string;
};

function extractCustomProperties(selector: string): Map<string, string> {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const blockMatch = layoutCss.match(new RegExp(`${escapedSelector}\\s*\\{([\\s\\S]*?)\\}`));

  if (!blockMatch) {
    throw new Error(`Could not find the ${selector} theme block in layout.css`);
  }

  const properties = new Map<string, string>();
  const propertyPattern = /(--[\w-]+)\s*:\s*([^;]+);/g;

  for (const match of blockMatch[1].matchAll(propertyPattern)) {
    properties.set(match[1], match[2].trim());
  }

  return properties;
}

function resolveCustomProperty(name: string, properties: Map<string, string>, stack = new Set<string>()): string {
  const value = properties.get(name);

  if (!value) {
    throw new Error(`Could not find ${name} in the CSS theme tokens`);
  }

  if (stack.has(name)) {
    throw new Error(`Circular CSS custom property reference detected for ${name}`);
  }

  const nextStack = new Set(stack).add(name);

  return value.replace(/var\((--[\w-]+)\)/g, (_, referencedName: string) =>
    resolveCustomProperty(referencedName, properties, nextStack),
  );
}

export function toSvgColor(color: string): string {
  // SVG image decoders need sRGB, while the portfolio uses CSS Color 4 Lab tokens.
  const lab = color.match(/^lab\(\s*([\d.]+)(%)?\s+(-?[\d.]+)(%)?\s+(-?[\d.]+)(%)?(?:\s*\/\s*([\d.]+)(%)?)?\s*\)$/i);

  if (lab) {
    const lightness = Number(lab[1]);
    const a = Number(lab[3]) * (lab[4] ? 1.25 : 1);
    const b = Number(lab[5]) * (lab[6] ? 1.25 : 1);
    const alpha = lab[7] ? Number(lab[7]) / (lab[8] ? 100 : 1) : 1;
    const fy = (lightness + 16) / 116;
    const inverse = (value: number) => (value > 6 / 29 ? value ** 3 : (108 / 841) * (value - 4 / 29));

    // Lab's D50 white point, Bradford-adapted to sRGB's D65 white point.
    const x50 = inverse(fy + a / 500) * (0.3457 / 0.3585);
    const y50 = inverse(fy);
    const z50 = inverse(fy - b / 200) * ((1 - 0.3457 - 0.3585) / 0.3585);
    const x = 0.9554734215 * x50 - 0.0230984549 * y50 + 0.0632592432 * z50;
    const y = -0.0283697093 * x50 + 1.0099953981 * y50 + 0.0210414412 * z50;
    const z = 0.0123140149 * x50 - 0.0205076493 * y50 + 1.3303659262 * z50;

    return linearRgbToHex(
      [
        3.2409699419 * x - 1.5373831776 * y - 0.4986107603 * z,
        -0.9692436363 * x + 1.8759675015 * y + 0.0415550574 * z,
        0.0556300797 * x - 0.2039769589 * y + 1.0569715142 * z,
      ],
      alpha,
    );
  }

  const match = color.match(
    /^oklch\(\s*([\d.]+)(%)?\s+([\d.]+)(%)?\s+([\d.]+)(?:deg)?(?:\s*\/\s*([\d.]+)(%)?)?\s*\)$/i,
  );

  if (!match) {
    return color;
  }

  const lightness = Number(match[1]) / (match[2] ? 100 : 1);
  const chroma = Number(match[3]) * (match[4] ? 0.004 : 1);
  const hue = (Number(match[5]) * Math.PI) / 180;
  const alpha = match[6] ? Number(match[6]) / (match[7] ? 100 : 1) : 1;
  const a = chroma * Math.cos(hue);
  const b = chroma * Math.sin(hue);

  const l = Math.pow(lightness + 0.3963377774 * a + 0.2158037573 * b, 3);
  const m = Math.pow(lightness - 0.1055613458 * a - 0.0638541728 * b, 3);
  const s = Math.pow(lightness - 0.0894841775 * a - 1.291485548 * b, 3);

  const linearRgb = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];

  return linearRgbToHex(linearRgb, alpha);
}

function linearRgbToHex(linearRgb: number[], alpha: number): string {
  const toHexChannel = (channel: number) => {
    const clamped = Math.max(0, Math.min(1, channel));
    const srgb = clamped <= 0.0031308 ? 12.92 * clamped : 1.055 * Math.pow(clamped, 1 / 2.4) - 0.055;
    return Math.round(srgb * 255)
      .toString(16)
      .padStart(2, "0");
  };

  const rgb = linearRgb.map(toHexChannel).join("");
  const alphaHex =
    alpha < 1
      ? Math.round(Math.max(0, Math.min(1, alpha)) * 255)
          .toString(16)
          .padStart(2, "0")
      : "";

  return `#${rgb}${alphaHex}`;
}

export function withAlpha(color: string, alpha: number): string {
  const srgbColor = toSvgColor(color).replace(/^#([\da-f])([\da-f])([\da-f])$/i, "#$1$1$2$2$3$3");
  const match = srgbColor.match(/^#([\da-f]{2})([\da-f]{2})([\da-f]{2})(?:[\da-f]{2})?$/i);

  if (!match) {
    return color;
  }

  const [, red, green, blue] = match;
  const clampedAlpha = Math.max(0, Math.min(1, alpha));

  return `rgba(${Number.parseInt(red, 16)}, ${Number.parseInt(green, 16)}, ${Number.parseInt(blue, 16)}, ${clampedAlpha})`;
}

const rootThemeProperties = extractCustomProperties(":root");
const darkThemeProperties = new Map([...rootThemeProperties, ...extractCustomProperties(".dark")]);

export const ogThemeColors: OgThemeColors = {
  background: resolveCustomProperty("--background", darkThemeProperties),
  foreground: resolveCustomProperty("--foreground", darkThemeProperties),
  foregroundMuted: resolveCustomProperty("--muted-foreground", darkThemeProperties),
  accent: resolveCustomProperty("--primary", darkThemeProperties),
  border: resolveCustomProperty("--border-subtle", darkThemeProperties),
};
