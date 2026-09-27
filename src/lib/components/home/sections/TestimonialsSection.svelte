<script lang="ts">
  import type { TweetData } from "$lib/types/portfolio";
  import TestimonialCard from "../cards/TestimonialCard.svelte";
  import TestimonialRow from "../cards/TestimonialRow.svelte";
  import SectionBlock from "../../layout/SectionBlock.svelte";

  let { title, items }: { title: string; items: TweetData[] } = $props();
  const half = $derived(Math.ceil(items.length / 2));
  const firstRow = $derived(items.slice(0, half));
  const secondRow = $derived(items.slice(half));
  let focusWithin = $state(false);

  function handleFocusOut(event: FocusEvent) {
    const viewport = event.currentTarget as HTMLElement;
    if (!(event.relatedTarget instanceof Node) || !viewport.contains(event.relatedTarget)) focusWithin = false;
  }
</script>

<SectionBlock {title}>
  <div class="hidden grid-cols-1 gap-4 motion-reduce:grid sm:grid-cols-2">
    {#each items as tweet (tweet.id_str)}
      <TestimonialCard {tweet} />
    {/each}
  </div>
  <div
    class="relative overflow-clip p-px motion-reduce:hidden"
    data-testimonials-viewport
    onfocusin={() => (focusWithin = true)}
    onfocusout={handleFocusOut}
  >
    <div
      class="from-background pointer-events-none absolute inset-y-0 left-0 z-10 w-5 bg-linear-to-r to-transparent"
    ></div>
    <div
      class="from-background pointer-events-none absolute inset-y-0 right-0 z-10 w-5 bg-linear-to-l to-transparent"
    ></div>
    {#if firstRow.length}
      <TestimonialRow items={firstRow} direction="left" paused={focusWithin} />
    {/if}
    {#if secondRow.length}
      <div class="mt-4"><TestimonialRow items={secondRow} direction="right" paused={focusWithin} /></div>
    {/if}
  </div>
</SectionBlock>
