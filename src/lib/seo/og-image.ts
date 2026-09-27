import ImageResponse from "@takumi-rs/image-response";
import { asset } from "$app/paths";
import { getRequestEvent } from "$app/server";
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

const takumiFontLoaders = [
  {
    key: "inter",
    name: "Inter",
    weight: 400,
    style: "normal" as const,
    data: async () => {
      const event = getRequestEvent();
      const fontUrl = new URL(asset("/fonts/InterVariable.woff2"), event.url);
      const assets = event.platform?.env?.ASSETS;
      const response = assets ? await assets.fetch(fontUrl) : await event.fetch(fontUrl);
      if (!response.ok) {
        throw new Error(`Failed to load Inter for Open Graph images (${response.status})`);
      }
      return response.arrayBuffer();
    },
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
          width: 2,
          height: DIVIDER_DASH_LENGTH,
          flexShrink: 0,
          background: colors.border,
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
        height: 2,
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
          background: colors.border,
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
        backgroundColor: colors.background,
        color: colors.foreground,
        fontFamily: "Inter, sans-serif",
      },
    },
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
              fontFamily: "Inter, sans-serif",
              fontSize: titleFontSize,
              fontWeight: 400,
              letterSpacing: "-0.05em",
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
