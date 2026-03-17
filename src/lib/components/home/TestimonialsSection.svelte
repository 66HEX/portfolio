<script lang="ts">
  import type { TestimonialItem } from "$lib/content/homepage-content";
  import LandingContentCard from "./LandingContentCard.svelte";
  import SectionBlock from "../ui/SectionBlock.svelte";

  type Props = {
    title: string;
    items: TestimonialItem[];
  };

  let { title, items }: Props = $props();

  function ensureMinimumItems(rowItems: TestimonialItem[], minimum = 3): TestimonialItem[] {
    if (rowItems.length === 0) {
      return [];
    }

    const targetMinimum = rowItems.length === 2 && minimum < 4 ? 4 : minimum;
    const result = [...rowItems];
    let cursor = 0;

    while (result.length < targetMinimum) {
      result.push(rowItems[cursor % rowItems.length]);
      cursor += 1;
    }

    if (rowItems.length > 1 && result[0] === result[result.length - 1]) {
      result.push(rowItems[cursor % rowItems.length]);
    }

    return result;
  }

  const half = $derived(Math.ceil(items.length / 2));
  const firstRow = $derived(ensureMinimumItems(items.slice(0, half)));
  const secondRow = $derived(ensureMinimumItems(items.slice(half).length > 0 ? items.slice(half) : items));

  const firstTrack = $derived([...firstRow, ...firstRow]);
  const secondTrack = $derived([...secondRow, ...secondRow]);
</script>

<SectionBlock {title} panelClass="relative p-0">
  <div class="overflow-hidden rounded-2xl px-0 py-3">
    <div class="from-background-inset absolute inset-y-0 left-0 z-10 w-5 rounded-l-2xl bg-linear-to-r to-transparent"></div>
    <div class="from-background-inset absolute inset-y-0 right-0 z-10 w-5 rounded-r-2xl bg-linear-to-l to-transparent"></div>
    <div class="marquee-row">
      <div class="marquee-track marquee-left py-0.5">
        {#each firstTrack as testimonial, index (`first-${testimonial.name}-${index}`)}
          <LandingContentCard
            card={{
              variant: "testimonial",
              name: testimonial.name,
              role: testimonial.role,
              text: testimonial.text,
              avatar: testimonial.avatar,
            }}
          />
        {/each}
      </div>
    </div>

    <div class="marquee-row mt-2">
      <div class="marquee-track marquee-right py-0.5">
        {#each secondTrack as testimonial, index (`second-${testimonial.name}-${index}`)}
          <LandingContentCard
            card={{
              variant: "testimonial",
              name: testimonial.name,
              role: testimonial.role,
              text: testimonial.text,
              avatar: testimonial.avatar,
            }}
          />
        {/each}
      </div>
    </div>
  </div>
</SectionBlock>

<style>
  .marquee-row {
    width: 100%;
  }

  .marquee-track {
    display: flex;
    width: max-content;
    gap: 0.75rem;
    will-change: transform;
    animation-timing-function: linear;
    animation-iteration-count: infinite;
    animation-duration: 42s;
  }

  .marquee-left {
    animation-name: marquee-left;
  }

  .marquee-right {
    animation-name: marquee-right;
  }

  @keyframes marquee-left {
    from {
      transform: translateX(0);
    }

    to {
      transform: translateX(calc(-50% - 0.375rem));
    }
  }

  @keyframes marquee-right {
    from {
      transform: translateX(calc(-50% - 0.375rem));
    }

    to {
      transform: translateX(0);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .marquee-track {
      animation: none;
    }
  }
</style>
