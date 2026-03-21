<script lang="ts">
  import LandingContentCard from "../cards/LandingContentCard.svelte";
  import CardGrid from "../../layout/CardGrid.svelte";
  import SectionBlock from "../../layout/SectionBlock.svelte";

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
    <CardGrid class="sm:grid-cols-2">
      {#each posts as post (post.slug)}
        {@const href = `/blog/${post.slug}`}
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
