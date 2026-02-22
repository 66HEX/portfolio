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
  import IconArrowLeft from "$lib/components/icons/IconArrowLeft.svelte";
  import FooterSection from "$lib/components/home/FooterSection.svelte";
  import { homepageContent } from "$lib/content/homepage-content";
  import Separator from "../ui/Separator.svelte";
  import PageCard from "../ui/PageCard.svelte";
  import { buildBlogPostingJsonLd, buildSeoMeta, toJsonLdScript } from "$lib/seo/meta";

  type Props = {
    children?: import("svelte").Snippet;
    title?: string;
    description?: string;
    date?: string;
    tags?: string[];
    thumbnail?: string;
  };

  let {
    children,
    title = "Blog post",
    description = "",
    date = "",
    tags = [],
    thumbnail = "/og-image.jpg",
  }: Props = $props();

  const articleSeo = $derived(
    buildSeoMeta({
      title: `${title} | Blog`,
      description: description || "Technical notes and workflow insights on frontend development and SvelteKit.",
      path: page.url.pathname,
      currentUrl: page.url,
      image: thumbnail,
      imageAlt: `${title} thumbnail`,
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
  <!-- eslint-disable-next-line svelte/no-at-html-tags -->
  {@html blogPostingJsonLdScript}
</svelte:head>

<PageCard class="pt-6">
  <a
    href={resolve("/")}
    class="text-foreground hover:text-gray-alpha-800 mb-3 inline-flex items-center gap-1.5 px-2 py-1.5 text-sm leading-none font-medium duration-150 ease-out"
    aria-label="Back to home"
  >
    <IconArrowLeft size={12} strokeWidth={2.25} />
    <span>Back to home</span>
  </a>

  <div class="bg-background border-gray-alpha-100 input-highlight relative h-45 w-full rounded-md border">
    <div class="absolute inset-0 overflow-hidden rounded-md">
      <img
        src={thumbnail}
        alt={`${title} thumbnail`}
        class="h-full w-full object-cover"
        width="1280"
        height="720"
        loading="eager"
        fetchpriority="high"
        decoding="async"
      />
    </div>
  </div>

  <div class="text-gray-alpha-800 mt-4 flex flex-wrap items-center gap-2 text-xs">
    {#if date}
      <time datetime={date}>{date}</time>
    {/if}
    {#each tags as tag, index (`${tag}-${index}`)}
      <span
        class="bg-background input-highlight text-foreground rounded-sm px-1.5 py-1 text-xs leading-none font-medium"
      >
        {tag}
      </span>
    {/each}
  </div>
  <div class="mt-3">
    <h1 class="text-foreground text-lg leading-none font-medium">
      {title}
    </h1>
    {#if description}
      <p class="text-gray-alpha-800 mt-3 text-sm leading-relaxed">
        {description}
      </p>
    {/if}
  </div>
  <Separator class="my-4" />
  <article data-doc-content class="text-gray-alpha-800 mt-3 w-full space-y-3 text-sm">
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
</PageCard>
