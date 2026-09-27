<script module lang="ts">
  export { default as blockquote } from "./markdown/Blockquote.svelte";
  export { default as code } from "./markdown/Code.svelte";
  export { default as hr } from "./markdown/Divider.svelte";
  export { default as h1 } from "./markdown/H1.svelte";
  export { default as h2 } from "./markdown/H2.svelte";
  export { default as h3 } from "./markdown/H3.svelte";
  export { default as h4 } from "./markdown/H4.svelte";
  export { default as h5 } from "./markdown/H5.svelte";
  export { default as h6 } from "./markdown/H6.svelte";
  export { default as img } from "./markdown/Image.svelte";
  export { default as a } from "./markdown/Link.svelte";
  export { default as li } from "./markdown/ListItem.svelte";
  export { default as ol } from "./markdown/OrderedList.svelte";
  export { default as p } from "./markdown/Paragraph.svelte";
  export { default as pre } from "./markdown/Pre.svelte";
  export { default as strong } from "./markdown/Strong.svelte";
  export { default as MarkdownPre } from "./markdown/MarkdownPre.svelte";
  export { default as table } from "./markdown/Table.svelte";
  export { default as tbody } from "./markdown/Tbody.svelte";
  export { default as td } from "./markdown/Td.svelte";
  export { default as th } from "./markdown/Th.svelte";
  export { default as thead } from "./markdown/Thead.svelte";
  export { default as tr } from "./markdown/Tr.svelte";
  export { default as ul } from "./markdown/UnorderedList.svelte";
  export { default as Steps } from "./markdown/Steps.svelte";
  export { default as Step } from "./markdown/Step.svelte";
</script>

<script lang="ts">
  import { Badge } from "$lib/components/ui/badge";
  import { Button } from "$lib/components/ui/button";
  import * as Tooltip from "$lib/components/ui/tooltip";
  import { resolve } from "$app/paths";
  import { page } from "$app/state";
  import IconRenderer from "$lib/components/icons/IconRenderer.svelte";
  import { IconArrowLeft } from "$lib/components/icons/data";
  import FooterSection from "$lib/components/home/sections/FooterSection.svelte";
  import { footerData } from "$portfolio/sections/footer";
  import SectionSeparator from "$lib/components/layout/SectionSeparator.svelte";
  import { buildBlogPostingJsonLd, buildSeoMeta, toJsonLdScript } from "$lib/seo/meta";

  type Props = {
    children?: import("svelte").Snippet;
    title?: string;
    description?: string;
    date?: string;
    tags?: string[];
    published?: boolean;
  };

  let { children, title = "Blog post", description = "", date = "", tags = [], published = false }: Props = $props();

  const ogImagePath = $derived.by(() => {
    const normalizedPath = page.url.pathname.replace(/\/+$/, "");
    if (normalizedPath === "" || normalizedPath === "/blog") {
      return "/blog/og/index";
    }

    if (normalizedPath.startsWith("/blog/")) {
      return `/blog/og/${normalizedPath.slice("/blog/".length)}`;
    }

    return "/blog/og/index";
  });

  const articleSeo = $derived(
    buildSeoMeta({
      title: `${title} | Blog`,
      description: description || "Technical notes and workflow insights on frontend development and SvelteKit.",
      path: page.url.pathname,
      currentUrl: page.url,
      image: ogImagePath,
      type: "article",
      robots: published ? "index,follow" : "noindex,nofollow",
      publishedTime: date,
      modifiedTime: date,
      tags,
      keywords: ["blog", "design engineering", "front-end", "sveltekit", ...tags],
    }),
  );

  const blogPostingJsonLdScript = $derived(
    toJsonLdScript(
      buildBlogPostingJsonLd({
        title,
        description: description || "Technical notes and workflow insights on frontend development and SvelteKit.",
        canonicalUrl: articleSeo.canonicalUrl,
        imageUrl: articleSeo.ogImageUrl,
        publishedTime: date,
        modifiedTime: date,
        tags,
      }),
    ),
  );
</script>

<svelte:head>
  <title>{articleSeo.title}</title>
  <link rel="canonical" href={articleSeo.canonicalUrl} />
  {#each articleSeo.metaTags as tag, index (`${tag.name ?? tag.property ?? "meta"}-${index}-${tag.content}`)}
    {#if tag.name}
      <meta name={tag.name} content={tag.content} />
    {:else if tag.property}
      <meta property={tag.property} content={tag.content} />
    {/if}
  {/each}
  <meta property="og:image:type" content="image/png" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <!-- eslint-disable-next-line svelte/no-at-html-tags -->
  {@html blogPostingJsonLdScript}
</svelte:head>

<div class="w-full">
  <div class="p-4">
    <Button href={resolve("/")} variant="ghost" size="sm" aria-label="Back to home">
      <IconRenderer icon={IconArrowLeft} size={12} />
      <span>Back to home</span>
    </Button>
    <SectionSeparator class="my-4" />
    <div class="text-muted-foreground flex flex-wrap items-center gap-2 text-xs">
      {#if date}
        <time datetime={date}>{date}</time>
      {/if}
    </div>
    {#if !published}<Badge variant="secondary" class="mt-2">Draft preview</Badge>{/if}
    <div class="mt-2">
      <h1 class="text-foreground font-display text-xl leading-none font-medium tracking-tight">
        {title}
      </h1>
      {#if description}
        <p class="text-muted-foreground mt-2 text-sm text-pretty">
          {description}
        </p>
      {/if}
      {#each tags as tag, index (`${tag}-${index}`)}
        <Badge variant="secondary" class="mt-2 mr-1 font-mono">{tag}</Badge>
      {/each}
    </div>
  </div>
  <SectionSeparator />
  <article
    data-doc-content
    class="text-muted-foreground w-full space-y-3 p-4 text-sm [&>[data-heading]:first-child]:mt-0"
  >
    <Tooltip.Provider delayDuration={350} skipDelayDuration={100}>
      {@render children?.()}
    </Tooltip.Provider>
  </article>
  <SectionSeparator />
  <FooterSection content={footerData.footer} />
</div>
