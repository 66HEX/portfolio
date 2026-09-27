<script lang="ts">
  import type { HomepageContent } from "$lib/types/portfolio";
  import type { WritingPost } from "$lib/features/writing/types";
  import CardList from "$lib/components/layout/CardList.svelte";
  import SectionBlock from "$lib/components/layout/SectionBlock.svelte";
  import WritingCard from "../cards/WritingCard.svelte";

  let { posts, content }: { posts: WritingPost[]; content: HomepageContent["writing"] } = $props();
</script>

<SectionBlock title={content.title}>
  <CardList items={posts} getKey={(post) => post.href}>
    {#snippet children(post)}<WritingCard {post} readArticleLabel={content.readArticleLabel} />{/snippet}
  </CardList>
</SectionBlock>
