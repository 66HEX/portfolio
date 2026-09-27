let colorContext: CanvasRenderingContext2D | null | undefined;

/** Convert a resolved CSS color to the opaque sRGB hex format expected by shaders. */
export function cssColorToHex(value: string, fallback: string): string {
  const color = value.trim();
  if (/^#[\da-f]{6}$/i.test(color)) return color;
  if (typeof document === "undefined") return fallback;

  if (colorContext === undefined) {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 1;
    colorContext = canvas.getContext("2d", { colorSpace: "srgb", willReadFrequently: true });
  }
  if (!colorContext) return fallback;

  // Invalid canvas colors leave fillStyle unchanged; check against two sentinels.
  colorContext.fillStyle = "#000000";
  colorContext.fillStyle = color;
  const parsed = colorContext.fillStyle;
  colorContext.fillStyle = "#ffffff";
  colorContext.fillStyle = color;
  if (colorContext.fillStyle !== parsed) return fallback;

  colorContext.clearRect(0, 0, 1, 1);
  colorContext.fillRect(0, 0, 1, 1);
  const [r, g, b, a] = colorContext.getImageData(0, 0, 1, 1).data;
  if (a === 0) return fallback;
  return `#${[r, g, b].map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
}
