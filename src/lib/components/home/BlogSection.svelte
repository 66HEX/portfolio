<script lang="ts">
  import { resolve } from "$app/paths";
  import LandingContentCard from "./LandingContentCard.svelte";
  import CardGrid from "../ui/CardGrid.svelte";
  import SectionBlock from "../ui/SectionBlock.svelte";

  type BlogPostMeta = {
    slug: string;
    title: string;
    description: string;
    date: string;
  };

  type Props = {
    posts: BlogPostMeta[];
    title: string;
    emptyStateLabel: string;
    readArticleLabel: string;
  };

  let { posts, title, emptyStateLabel, readArticleLabel }: Props = $props();
</script>

<SectionBlock {title}>
  {#if posts.length === 0}
    <p class="text-foreground-muted text-base leading-none">{emptyStateLabel}</p>
  {:else}
    <CardGrid>
      {#each posts as post (post.slug)}
        {@const href = resolve(`/blog/${post.slug}` as Parameters<typeof resolve>[0])}
        <LandingContentCard
          card={{
            variant: "blog",
            title: post.title,
            description: post.description,
            date: post.date,
            href,
            ctaLabel: readArticleLabel,
          }}
        />
      {/each}
    </CardGrid>
  {/if}
</SectionBlock>
