import ImageResponse from "@takumi-rs/image-response";
import { dev } from "$app/environment";
import { asset } from "$app/paths";
import { getRequestEvent } from "$app/server";
import { ogArtwork, ogArticleArtwork, ogBrandMark } from "$lib/seo/og-artwork";
import { ogThemeColors as colors } from "$lib/seo/og-theme";

export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;

type TakumiElement = {
  type: string;
  props: Record<string, unknown>;
  key: string | null;
};

type TakumiChild = TakumiElement | string;

type OgImageOptions = {
  title: string;
  description?: string;
  category?: string;
  kind?: "portfolio" | "article";
};

const el = (type: string, props: Record<string, unknown> = {}, ...children: TakumiChild[]): TakumiElement => ({
  type,
  key: null,
  props: children.length === 0 ? props : { ...props, children: children.length === 1 ? children[0] : children },
});

const takumiFontLoaders = [
  {
    key: "tomato-grotesk",
    name: "Tomato Grotesk",
    weight: 400,
    style: "normal" as const,
    data: async () => {
      const event = getRequestEvent();
      const fontUrl = new URL(asset("/fonts/TomatoGrotesk-Regular.woff2"), event.url);
      const assets = event.platform?.env?.ASSETS;
      // The dev ASSETS binding serves the last build, which may not contain fonts yet.
      const response = !dev && assets ? await assets.fetch(fontUrl) : await event.fetch(fontUrl);
      if (!response.ok) {
        throw new Error(`Failed to load Tomato Grotesk for Open Graph images (${response.status})`);
      }
      return response.arrayBuffer();
    },
  },
];

const createComponent = ({ title, description, category = "Writing", kind = "portfolio" }: OgImageOptions) => {
  const isArticle = kind === "article";
  const titleSize = isArticle ? (title.length > 70 ? 60 : title.length > 44 ? 68 : 76) : 88;

  return el(
    "div",
    {
      style: {
        position: "relative",
        display: "flex",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        backgroundColor: colors.background,
        color: colors.foreground,
        fontFamily: "Tomato Grotesk, sans-serif",
        fontWeight: 400,
      },
    },
    el("img", {
      src: isArticle ? ogArticleArtwork : ogArtwork,
      alt: "",
      width: OG_WIDTH,
      height: OG_HEIGHT,
      style: { position: "absolute", inset: 0 },
    }),
    el(
      "div",
      {
        style: {
          position: "absolute",
          left: 76,
          top: 64,
          display: "flex",
          alignItems: "center",
          gap: 12,
        },
      },
      el("img", { src: ogBrandMark, alt: "", width: 28, height: 28 }),
      el(
        "div",
        {
          style: {
            fontSize: 28,
            lineHeight: 1,
            letterSpacing: "-0.035em",
          },
        },
        "madebyhex",
      ),
    ),
    el(
      "div",
      {
        style: {
          position: "absolute",
          left: 76,
          bottom: 76,
          width: 1048,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          gap: 24,
        },
      },
      ...(isArticle
        ? [
            el(
              "div",
              {
                style: {
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  fontSize: 20,
                  letterSpacing: "0.12em",
                  color: colors.accent,
                  textTransform: "uppercase",
                },
              },
              el("div", { style: { width: 7, height: 7, backgroundColor: colors.accent, borderRadius: 2 } }),
              category,
            ),
          ]
        : []),
      el(
        "div",
        {
          style: {
            width: isArticle ? 1000 : 1048,
            fontSize: titleSize,
            letterSpacing: "-0.045em",
            lineHeight: 1.08,
            textWrap: "balance",
            overflowWrap: "anywhere",
            lineClamp: 3,
          },
        },
        title,
      ),
      ...(!isArticle && description
        ? [el("div", { style: { color: colors.foregroundMuted, fontSize: 30, lineHeight: 1.3 } }, description)]
        : []),
    ),
  );
};

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
