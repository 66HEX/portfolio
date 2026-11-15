import { brandLogoRaw } from "$lib";
import keyboardArtwork from "$lib/seo/assets/keyboard-studio.png?inline";
import keyboardArticleArtwork from "$lib/seo/assets/keyboard-studio-article.png?inline";
import { ogThemeColors as colors, toSvgColor } from "$lib/seo/og-theme";

const svgDataUri = (svg: string) => `data:image/svg+xml,${encodeURIComponent(svg.trim())}`;
const ink = toSvgColor(colors.foreground);
const mark = brandLogoRaw
  .replace(/<svg[^>]*>/, "")
  .replace(/<\/svg>/, "")
  .replace(/fill="(?:#000000|currentColor)"/gi, 'fill="inherit"');

export const ogBrandMark = svgDataUri(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${ink}">${mark}</svg>
`);

// Captured from the homepage shader with scripts/render-og-keyboard.mjs.
// The Blender alternative remains in assets/hex-studio.png.
// Both variants are precomposited and dithered to avoid quantizing alpha again.
// Inline assets so Workers never need an extra network request.
export const ogArtwork = keyboardArtwork;
export const ogArticleArtwork = keyboardArticleArtwork;
