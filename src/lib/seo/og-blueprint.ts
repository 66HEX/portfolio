import { brandLogoRaw } from "$lib";
import { ogThemeColors as colors, toSvgColor, withAlpha } from "$lib/seo/og-theme";

// Trimming keeps SVG detection consistent between the native and WASM renderers.
const svgDataUri = (svg: string) => `data:image/svg+xml,${encodeURIComponent(svg.trim())}`;
const background = toSvgColor(colors.background);
const ink = toSvgColor(colors.foreground);
const accent = toSvgColor(colors.accent);

// Both faces use the portfolio's original mark, with a small offset for depth.
const outlinedLogo = brandLogoRaw
  .replace(/<svg[^>]*>/, "")
  .replace(/<\/svg>/, "")
  .replace(/fill="(?:#000000|currentColor)"/gi, 'fill="inherit"');

const logo = { x: 732, y: 112, scale: 15, depthX: 26, depthY: -20 };
const shoulderY = logo.y + 6.36216 * logo.scale;
const bottomY = logo.y + 24 * logo.scale;
const rightX = logo.x + 24 * logo.scale;

// Join the same vertices on the front and back faces. These are edges, not guides.
const sideEdges = [
  [0, 6.36216],
  [9.64843, 0.924413],
  [24, 7.32011],
  [24, 17.606],
  [14.3519, 23.0602],
  [12.7004, 24],
  [0.0204201, 16.6646],
]
  .map(([x, y]) => {
    const px = logo.x + x * logo.scale;
    const py = logo.y + y * logo.scale;
    return `M${px} ${py}l${logo.depthX} ${logo.depthY}`;
  })
  .join("");

export const ogBlueprint = svgDataUri(`
  <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
    <defs>
      <clipPath id="frame"><rect x="40" y="40" width="1120" height="550" rx="24" /></clipPath>
      <pattern id="grid" width="84" height="84" patternUnits="userSpaceOnUse" x="40" y="40">
        <path d="M84 0H0V84" fill="none" stroke="${ink}" stroke-opacity="0.15" stroke-width="2" />
      </pattern>
    </defs>

    <g clip-path="url(#frame)">
      <rect x="40" y="40" width="504" height="${shoulderY - 40}" fill="url(#grid)" />
      <g fill="none" stroke="${ink}" stroke-opacity="0.15" stroke-width="2">
        <path d="M544 40V${shoulderY}M40 ${shoulderY}H${logo.x}V590" />
        <path d="M${rightX} 40V590M${logo.x} ${bottomY}H1160" />
        <circle cx="912" cy="292" r="216" />
      </g>

      <g transform="translate(${logo.x + logo.depthX} ${logo.y + logo.depthY}) scale(${logo.scale})" fill="${background}" stroke="${withAlpha(colors.accent, 0.4)}" stroke-width="0.14" stroke-linejoin="round">
        ${outlinedLogo}
      </g>
      <path d="${sideEdges}" fill="none" stroke="${accent}" stroke-opacity="0.5" stroke-width="2" />
      <g transform="translate(${logo.x} ${logo.y}) scale(${logo.scale})" fill="${background}" stroke="${withAlpha(colors.accent, 0.72)}" stroke-width="0.16" stroke-linejoin="round">
        ${outlinedLogo}
      </g>
    </g>
    <rect x="40.5" y="40.5" width="1119" height="549" rx="24" fill="none" stroke="${ink}" stroke-opacity="0.15" stroke-width="2" />
  </svg>
`);
