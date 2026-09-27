<script lang="ts">
  import type { Attachment } from "svelte/attachments";
  import type { TweetData } from "$lib/features/tweets/types";
  import { createTestimonialMarquee } from "$lib/features/tweets/marquee";
  import TestimonialCard from "./TestimonialCard.svelte";

  let { items, direction, paused }: { items: TweetData[]; direction: "left" | "right"; paused: boolean } = $props();
  const cycle = $derived(
    Array.from({ length: Math.ceil(3 / items.length) * items.length }, (_, index) => items[index % items.length]),
  );

  const animateRow: Attachment<HTMLElement> = (row) => {
    const marquee = createTestimonialMarquee(row, { itemCount: items.length, cycleLength: cycle.length, direction });
    $effect(() => marquee.setPaused(paused));
    return () => marquee.destroy();
  };
</script>

<div class="marquee-row relative w-full overflow-clip" {@attach animateRow}>
  <div class="flex w-max gap-4" data-marquee-track>
    {#each [0, 1, 2] as copy (copy)}
      {#each cycle as tweet, index (`${copy}-${index}-${tweet.id_str}`)}
        <div
          class="marquee-item flex-none"
          data-marquee-item
          data-testimonial-index={index % items.length}
          aria-hidden="true"
        >
          <TestimonialCard {tweet} tabindex={-1} />
        </div>
      {/each}
    {/each}
  </div>
</div>

<style>
  .marquee-row {
    container-type: inline-size;
  }

  .marquee-item {
    width: min(22rem, calc(100cqw - 2.5rem));
  }
</style>
