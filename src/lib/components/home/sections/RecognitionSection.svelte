<script lang="ts">
  import type { HomepageContent } from "$lib/types/portfolio";
  import CardList from "$lib/components/layout/CardList.svelte";
  import SectionBlock from "$lib/components/layout/SectionBlock.svelte";
  import RecognitionCard from "../cards/RecognitionCard.svelte";

  let { content }: { content: HomepageContent["recognition"] } = $props();
</script>

<SectionBlock title={content.title}>
  <CardList items={content.items} getKey={(item) => `${item.href}-${item.date}`}>
    {#snippet children(item)}
      <RecognitionCard {item} learnMoreLabel={content.learnMoreLabel} />
    {/snippet}
  </CardList>
</SectionBlock>
