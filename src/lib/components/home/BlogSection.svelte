<script lang="ts">
  import IconChevronRight from "$lib/components/icons/IconChevronRight.svelte";
  import { resolve } from "$app/paths";
  import Tooltip from "$lib/components/ui/Tooltip.svelte";
  import ContentCard from "../ui/ContentCard.svelte";
  import IconLinkButton from "../ui/IconLinkButton.svelte";
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
    <p class="text-gray-alpha-800 text-base leading-none">{emptyStateLabel}</p>
  {:else}
    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {#each posts as post (post.slug)}
        {@const href = resolve(`/blog/${post.slug}` as Parameters<typeof resolve>[0])}
        <ContentCard class="relative flex flex-col pb-14">
          <div class="text-gray-alpha-800 mb-3 text-xs leading-none">
            <time datetime={post.date}>{post.date}</time>
          </div>

          <h3 class="text-foreground truncate pb-3 text-base leading-none font-medium">{post.title}</h3>
          <p class="text-gray-alpha-800 text-sm leading-relaxed">
            {post.description}
          </p>

          <div class="bg-background input-highlight absolute! right-3 bottom-3 flex items-center gap-1 rounded-md p-1">
            <Tooltip content={readArticleLabel} delay={120}>
              <IconLinkButton {href} ariaLabel={`${readArticleLabel}: ${post.title}`} target="_self" rel="">
                <IconChevronRight size={16} />
              </IconLinkButton>
            </Tooltip>
          </div>
        </ContentCard>
      {/each}
    </div>
  {/if}
</SectionBlock>
