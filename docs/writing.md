# Writing

## Local articles

Use `pnpm post:new "Article title"`. Optional flags:

```sh
pnpm post:new "Designing a shader" --slug graphics/my-shader --date 2026-09-27
```

The result is `src/portfolio/posts/graphics/my-shader.svx`, served at `/blog/graphics/my-shader`. The CLI generates a safe slug from a title, creates parent folders and refuses to overwrite a file. For titles outside the Latin alphabet, supply a lowercase ASCII slug yourself.

You can also create a `.svx` file manually:

```yaml
---
title: "Article title"
description: "A short summary for the list and social preview."
date: "2026-09-27"
tags:
  - svelte
  - graphics
published: false
---
```

`title`, `description` and a real `YYYY-MM-DD` date are required. Quote dates. `tags` defaults to `[]`; `published` defaults to `false`. The filename determines the URL. Slugs use lowercase words separated by hyphens; nested directories are supported. The first path segment cannot be `raw` or `og`, because those are reserved endpoints.

`layout: docs` is supported for existing content but unnecessary: the article layout is the default. It supplies the page title, description, tags, SEO, footer and component styling. Start the article body at `##` to avoid repeating its title.

## Drafts and publishing

Run `pnpm dev` and open the draft URL directly. Drafts show a preview badge and use `noindex` plus `no-store`; they stay out of Writing, sitemap, raw Markdown and OG endpoints. Production article routes return 404 for drafts, and production browser bundles import only published article components.

Before publishing:

1. Finish the description, date, tags and content.
2. Set `published: true`.
3. Run `pnpm verify` and inspect the page.
4. Commit and deploy through your normal workflow.

There is no scheduled publishing: a future date affects ordering, while `published` controls availability. Removing a post changes its URL to a 404; add an explicit redirect if you need to preserve inbound links after a rename. Drafts are still source files in your repository, so do not store secrets in them.

## Markdown and Svelte

The renderer supports headings H1–H6 with copy-link actions, paragraphs, bold/italic text, links, images, quotes, horizontal rules, ordered/unordered/nested lists, task lists, tables and fenced code. Long code and tables use the existing scroll areas and card focus styles.

Put blog media under `static/images/blog/` and reference `/images/blog/example.webp`. Supply meaningful alt text. Markdown images get the shared card wrapper; linking an image keeps the existing keyboard focus treatment.

Fenced code accepts Shiki's bundled languages and aliases, including `ts`, `svelte`, `python`, `rust` and `bash`. Grammars load when used. An unknown language logs a build warning and renders plain text. Line numbers, copy feedback and light/dark themes are automatic. Copying preserves the original source rather than the rendered line numbers.

Tables use normal Markdown alignment syntax (`:---`, `:---:`, `---:`). Escape literal cell pipes with `\|`, including inside inline code; they remain one code expression.

Custom Svelte components can be imported in an article's instance script:

```svelte
<script>
  import { Steps, Step } from "$lib/features/blog/components/markdown";
</script>

<Steps>
  <Step title="Install">
    <p>Install the dependencies.</p>
  </Step>
  <Step title="Run">
    <p>Start the development server.</p>
  </Step>
</Steps>
```

Use blank lines when placing Markdown inside component tags. HTML content, Svelte expressions and imports are executable source; write articles from trusted authors, just like other code in this repository. In prose, escape literal `{` and `}` when mdsvex would interpret them as Svelte expressions. Fenced code handles them automatically.

## External publications

Add records to `src/portfolio/publications.ts`. Declare a service once in `publicationSources`, then reference its key:

```ts
export const publicationSources = {
  codrops: "Codrops",
  example: "Example Magazine",
} as const;

// Add to externalPosts:
{
  title: "Article title",
  description: "A short description.",
  date: "2026-09-27",
  href: "https://example.com/article",
  source: "example",
  published: true,
}
```

The service name supplies both the badge and `Read on …` tooltip. URLs must use HTTPS and be unique. External articles open the publisher's page in a new tab; no local page or OG route is created.

Writing combines published local/external posts, sorts by date, then applies `portfolio.writing.limit`. Older published local posts remain available at their URLs and in the sitemap. There is currently no separate archive page.

## Generated endpoints

A published local post automatically has:

- `/blog/<slug>`: article;
- `/blog/raw/<slug>`: original Markdown source, marked `noindex`;
- `/blog/og/<slug>`: generated social preview;
- an entry in `/sitemap.xml` and `/llms.txt`.

Canonical URLs always use `portfolio.url`, including in local previews. This prevents localhost and Worker preview domains from becoming the canonical site.
