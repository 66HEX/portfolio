import ImageResponse from "@takumi-rs/image-response";
import apkAvionicaDataUri from "$lib/assets/fonts/APK-Avionica.woff2?inline";
import apkGaleriaMediumDataUri from "$lib/assets/fonts/APK-Galeria-Medium.woff2?inline";
import apkGaleriaRegularDataUri from "$lib/assets/fonts/APK-Galeria-Regular.woff2?inline";
import { brandLogoRaw } from "$lib";
import { ogThemeColors as colors, withAlpha } from "$lib/seo/og-theme";

export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;
export const OG_GRID_INSET = 96;

const DIVIDER_DASH_LENGTH = 6;
const DIVIDER_DASH_GAP = 6;
const VERTICAL_DASH_COUNT = Math.ceil(OG_HEIGHT / (DIVIDER_DASH_LENGTH + DIVIDER_DASH_GAP));
const HORIZONTAL_DASH_COUNT = Math.ceil(OG_WIDTH / (DIVIDER_DASH_LENGTH + DIVIDER_DASH_GAP));

type TakumiElement = {
  type: string;
  props: Record<string, unknown>;
  key: string | null;
};

type TakumiChild = TakumiElement | string;

type OgImageOptions = {
  title: string;
  description: string;
  titleFontSize?: number;
  titleLineHeight?: number;
  descriptionLineHeight?: number;
};

const el = (type: string, props: Record<string, unknown> = {}, ...children: TakumiChild[]): TakumiElement => ({
  type,
  key: null,
  props:
    children.length === 0
      ? props
      : {
          ...props,
          children: children.length === 1 ? children[0] : children,
        },
});

const dataUriToArrayBuffer = (dataUri: string) => {
  const base64 = dataUri.slice(dataUri.indexOf(",") + 1);
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes.buffer;
};

const fontDataPromise = Promise.all([
  Promise.resolve(dataUriToArrayBuffer(apkGaleriaRegularDataUri)),
  Promise.resolve(dataUriToArrayBuffer(apkGaleriaMediumDataUri)),
  Promise.resolve(dataUriToArrayBuffer(apkAvionicaDataUri)),
]);

const takumiFontLoaders = [
  {
    key: "apk-galeria-regular",
    name: "APK Galeria",
    weight: 400,
    style: "normal" as const,
    data: async () => (await fontDataPromise)[0],
  },
  {
    key: "apk-galeria-medium",
    name: "APK Galeria",
    weight: 500,
    style: "normal" as const,
    data: async () => (await fontDataPromise)[1],
  },
  {
    key: "apk-avionica",
    name: "APK Avionica",
    weight: 400,
    style: "normal" as const,
    data: async () => (await fontDataPromise)[2],
  },
];

const logoDataUri = `data:image/svg+xml,${encodeURIComponent(
  brandLogoRaw.replace(/fill="(?:#000000|currentColor)"/gi, `fill="${withAlpha(colors.foreground, 0.58)}"`),
)}`;

const verticalDivider = (left: number) =>
  el(
    "div",
    {
      style: {
        position: "absolute",
        top: 0,
        bottom: 0,
        left,
        display: "flex",
        flexDirection: "column",
        gap: DIVIDER_DASH_GAP,
        width: 1,
        overflow: "hidden",
      },
    },
    ...Array.from({ length: VERTICAL_DASH_COUNT }, () =>
      el("div", {
        style: {
          display: "flex",
          width: 1,
          height: DIVIDER_DASH_LENGTH,
          flexShrink: 0,
          background: withAlpha(colors.shadowHighlight, 0.08),
        },
      }),
    ),
  );

const horizontalDivider = (top: number) =>
  el(
    "div",
    {
      style: {
        position: "absolute",
        top,
        right: 0,
        left: 0,
        display: "flex",
        gap: DIVIDER_DASH_GAP,
        height: 1,
        overflow: "hidden",
      },
    },
    ...Array.from({ length: HORIZONTAL_DASH_COUNT }, () =>
      el("div", {
        style: {
          display: "flex",
          width: DIVIDER_DASH_LENGTH,
          height: 1,
          flexShrink: 0,
          background: withAlpha(colors.shadowHighlight, 0.08),
        },
      }),
    ),
  );

const createComponent = ({
  title,
  description,
  titleFontSize = 64,
  titleLineHeight = 1,
  descriptionLineHeight = 1.25,
}: OgImageOptions) =>
  el(
    "div",
    {
      style: {
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        backgroundColor: colors.backgroundInset,
        color: colors.foreground,
        fontFamily: "APK Galeria, sans-serif",
      },
    },
    el("div", {
      style: {
        position: "absolute",
        top: -90,
        right: -90,
        bottom: -90,
        left: -90,
        backgroundColor: colors.backgroundInset,
        backgroundImage: `radial-gradient(ellipse 50% 80% at 50% 50%, rgba(0, 0, 0, 0) 72%, rgba(0, 0, 0, 0.92) 100%), radial-gradient(ellipse 100% 110% at 50% 0%, ${colors.backgroundInset} 37%, ${colors.accent} 69%, ${colors.foreground} 100%)`,
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundSize: `${OG_WIDTH}px ${OG_HEIGHT}px`,
        filter: "blur(90px)",
      },
    }),
    verticalDivider(OG_GRID_INSET),
    verticalDivider(OG_WIDTH - OG_GRID_INSET),
    horizontalDivider(OG_GRID_INSET),
    horizontalDivider(OG_HEIGHT - OG_GRID_INSET),
    el("img", {
      src: logoDataUri,
      alt: "",
      style: {
        position: "absolute",
        top: OG_GRID_INSET + 12,
        left: OG_GRID_INSET + 12,
        display: "flex",
        width: 72,
        height: 72,
      },
    }),
    el(
      "div",
      {
        style: {
          position: "absolute",
          bottom: OG_GRID_INSET + 12,
          left: OG_GRID_INSET + 12,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          gap: 8,
        },
      },
      el(
        "div",
        {
          style: {
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            gap: 8,
          },
        },
        el(
          "div",
          {
            style: {
              display: "flex",
              maxWidth: OG_WIDTH - OG_GRID_INSET * 2,
              color: colors.foreground,
              fontFamily: "APK Avionica, APK Galeria, sans-serif",
              fontSize: titleFontSize,
              fontWeight: 400,
              letterSpacing: "-0.025em",
              lineHeight: titleLineHeight,
              textAlign: "left",
              textWrapStyle: "pretty",
            },
          },
          title,
        ),
        el(
          "div",
          {
            style: {
              display: "flex",
              maxWidth: OG_WIDTH - OG_GRID_INSET * 2,
              color: withAlpha(colors.foreground, 0.58),
              fontSize: 24,
              lineHeight: descriptionLineHeight,
              textAlign: "left",
              textWrapStyle: "pretty",
            },
          },
          description,
        ),
      ),
    ),
  );

export async function createOgImage(options: OgImageOptions) {
  const response = new ImageResponse(createComponent(options), {
    width: OG_WIDTH,
    height: OG_HEIGHT,
    format: "png",
    fonts: takumiFontLoaders,
    headers: {
      "content-type": "image/png",
      "cache-control": "public, max-age=3600",
    },
  });

  await response.ready;
  return response;
}
