<script lang="ts">
  import type { TestimonialItem } from "$lib/content/homepage-content";
  import ContentCard from "../ui/ContentCard.svelte";
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
  <div class="overflow-hidden rounded-lg px-0 py-3">
    <div class="from-background absolute inset-y-0 left-0 z-10 w-5 rounded-l-lg bg-linear-to-r to-transparent"></div>
    <div class="from-background absolute inset-y-0 right-0 z-10 w-5 rounded-r-lg bg-linear-to-l to-transparent"></div>
    <div class="marquee-row">
      <div class="marquee-track marquee-left py-0.5">
        {#each firstTrack as testimonial, index (`first-${testimonial.name}-${index}`)}
          <ContentCard class="w-[min(20rem,calc(100vw-3.5rem))] flex-none">
            <div class="flex items-center gap-2">
              <div class="input-highlight bg-background size-9 rounded-full">
                <img
                  src={testimonial.avatar}
                  alt={`${testimonial.name} avatar`}
                  class="rounded-full object-cover"
                  loading="lazy"
                  width="36"
                  height="36"
                  decoding="async"
                />
              </div>
              <div class="flex flex-col">
                <p class="text-foreground text-base leading-none font-medium">
                  {testimonial.name}
                </p>
                <p class="text-gray-alpha-800 mt-2 text-xs leading-none">
                  {testimonial.role}
                </p>
              </div>
            </div>
            <p class="text-gray-alpha-800 mt-3 text-sm leading-relaxed">
              {testimonial.text}
            </p>
          </ContentCard>
        {/each}
      </div>
    </div>

    <div class="marquee-row mt-2">
      <div class="marquee-track marquee-right py-0.5">
        {#each secondTrack as testimonial, index (`second-${testimonial.name}-${index}`)}
          <ContentCard class="w-[min(20rem,calc(100vw-3.5rem))] flex-none">
            <div class="flex items-center gap-2">
              <div class="input-highlight bg-background size-9 rounded-full">
                <img
                  src={testimonial.avatar}
                  alt={`${testimonial.name} avatar`}
                  class="rounded-full object-cover"
                  loading="lazy"
                  width="36"
                  height="36"
                  decoding="async"
                />
              </div>
              <div class="flex flex-col">
                <p class="text-foreground text-base leading-none font-medium">
                  {testimonial.name}
                </p>
                <p class="text-gray-alpha-800 mt-2 text-xs leading-none">
                  {testimonial.role}
                </p>
              </div>
            </div>
            <p class="text-gray-alpha-800 mt-3 text-sm leading-relaxed">
              {testimonial.text}
            </p>
          </ContentCard>
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
