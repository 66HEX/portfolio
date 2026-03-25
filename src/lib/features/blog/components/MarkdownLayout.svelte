<script module lang="ts">
  import MarkdownPre from "./markdown/MarkdownPre.svelte";

  Reflect.set(globalThis, "__MarkdownPre", MarkdownPre);

  export { default as blockquote } from "./markdown/Blockquote.svelte";
  export { default as code } from "./markdown/Code.svelte";
  export { default as hr } from "./markdown/Divider.svelte";
  export { default as h1 } from "./markdown/H1.svelte";
  export { default as h2 } from "./markdown/H2.svelte";
  export { default as h3 } from "./markdown/H3.svelte";
  export { default as h4 } from "./markdown/H4.svelte";
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
  import { resolve } from "$app/paths";
  import { page } from "$app/state";
  import IconArrowLeft from "carbon-icons-svelte/lib/ArrowLeft.svelte";
  import FooterSection from "$lib/components/home/sections/FooterSection.svelte";
  import { homepageContent } from "$lib/content/homepage-content";
  import Separator from "$lib/components/ui/Separator.svelte";
  import { buildBlogPostingJsonLd, buildSeoMeta, toJsonLdScript } from "$lib/seo/meta";

  type Props = {
    children?: import("svelte").Snippet;
    title?: string;
    description?: string;
    date?: string;
    tags?: string[];
  };

  let { children, title = "Blog post", description = "", date = "", tags = [] }: Props = $props();

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
    <a
      href={resolve("/")}
      class="text-foreground-muted hover:text-foreground inline-flex items-center gap-1.5 text-xs leading-none font-medium duration-150 ease-out"
      aria-label="Back to home"
    >
      <IconArrowLeft width={12} height={12} />
      <span>Back to home</span>
    </a>
    <Separator class="my-4" />
    <div class="text-foreground-muted flex flex-wrap items-center gap-2 pt-4 text-xs">
      {#if date}
        <time datetime={date}>{date}</time>
      {/if}
    </div>
    <div class="mt-3">
      <h1 class="text-foreground text-xl leading-none font-medium">
        {title}
      </h1>
      {#if description}
        <p class="text-foreground-muted mt-1 text-sm">
          {description}
        </p>
      {/if}
      {#each tags as tag, index (`${tag}-${index}`)}
        <div
          class="inset-shadow bg-background-inset text-foreground relative mt-3 mr-1 inline-flex w-fit rounded-sm p-0.75 font-mono text-xs font-medium whitespace-nowrap"
        >
          <code class="bg-background card rounded-[calc(var(--radius-base)*1.5)] px-1.5 py-0.5">
            {tag}
          </code>
        </div>
      {/each}
    </div>
  </div>
  <Separator class="mb-4" />
  <article data-doc-content class="text-foreground-muted mt-3 w-full space-y-3 p-4 text-sm">
    {@render children?.()}
  </article>
  <Separator class="my-4" />
  <FooterSection
    headline={homepageContent.footer.headline}
    description={homepageContent.footer.description}
    socialLinks={homepageContent.footer.socialLinks}
    copyrightName={homepageContent.footer.copyrightName}
    copyrightSuffix={homepageContent.footer.copyrightSuffix}
  />
</div>
