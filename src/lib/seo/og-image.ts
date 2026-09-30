import ImageResponse from "@takumi-rs/image-response";
import { dev } from "$app/environment";
import { asset } from "$app/paths";
import { getRequestEvent } from "$app/server";
import { portfolio } from "../../portfolio/config";
import { ogBlueprint } from "$lib/seo/og-blueprint";
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
  description: string;
  kind?: "portfolio" | "article";
};

const el = (type: string, props: Record<string, unknown> = {}, ...children: TakumiChild[]): TakumiElement => ({
  type,
  key: null,
  props: children.length === 0 ? props : { ...props, children: children.length === 1 ? children[0] : children },
});

const takumiFontLoaders = [
  {
    key: "mona-sans",
    name: "Mona Sans",
    weight: 400,
    style: "normal" as const,
    data: async () => {
      const event = getRequestEvent();
      const fontUrl = new URL(asset("/fonts/MonaSans-Regular.woff2"), event.url);
      const assets = event.platform?.env?.ASSETS;
      // The dev ASSETS binding serves the last build, which may not contain fonts yet.
      const response = !dev && assets ? await assets.fetch(fontUrl) : await event.fetch(fontUrl);
      if (!response.ok) {
        throw new Error(`Failed to load Mona Sans for Open Graph images (${response.status})`);
      }
      return response.arrayBuffer();
    },
  },
];

const siteHost = new URL(portfolio.url).hostname;

const createComponent = ({ title, description, kind = "portfolio" }: OgImageOptions) => {
  const isArticle = kind === "article";
  const titleSize = isArticle ? (title.length > 58 ? 38 : title.length > 34 ? 46 : 54) : 64;

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
        fontFamily: "Mona Sans, sans-serif",
        fontWeight: 400,
      },
    },
    el("img", {
      src: ogBlueprint,
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
          left: 80,
          bottom: isArticle ? 128 : 144,
          width: 544,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          gap: isArticle ? 24 : 56,
        },
      },
      el(
        "div",
        { style: { display: "flex", flexDirection: "column", width: "100%", gap: 18 } },
        el(
          "div",
          {
            style: {
              width: "100%",
              fontSize: titleSize,
              letterSpacing: "-0.045em",
              lineHeight: 1.08,
              textWrap: "balance",
              overflowWrap: "anywhere",
              lineClamp: isArticle && title.length > 34 ? 3 : 2,
            },
          },
          title,
        ),
        el(
          "div",
          {
            style: {
              width: "100%",
              color: colors.foregroundMuted,
              fontSize: isArticle ? 21 : 26,
              lineHeight: 1.4,
              textWrap: "pretty",
              lineClamp: isArticle ? 3 : 2,
            },
          },
          description,
        ),
      ),
    ),
    el(
      "div",
      {
        style: {
          position: "absolute",
          left: 80,
          right: 80,
          top: 547,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: 17,
          color: colors.foregroundMuted,
        },
      },
      el("div", {}, siteHost),
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
