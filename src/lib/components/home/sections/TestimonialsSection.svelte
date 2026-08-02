<script lang="ts">
  import type { TweetData } from "$lib/content/types";
  import type { Attachment } from "svelte/attachments";
  import LandingContentCard from "../../layout/LandingContentCard.svelte";
  import SectionBlock from "../../layout/SectionBlock.svelte";

  type Props = {
    title: string;
    items: TweetData[];
  };

  let { title, items }: Props = $props();

  function ensureMinimumItems(rowItems: TweetData[], minimum = 3): TweetData[] {
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

  let focusWithin = $state(false);

  const observeMarqueeItems: Attachment<HTMLDivElement> = (viewport) => {
    if (typeof IntersectionObserver === "undefined") {
      return;
    }

    let active = true;
    let observer: IntersectionObserver | null = null;

    queueMicrotask(() => {
      if (!active) return;

      const items = viewport.querySelectorAll<HTMLElement>("[data-marquee-item]");

      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            const item = entry.target as HTMLElement;
            const link = item.querySelector<HTMLAnchorElement>("a[href]");
            const isVisible = entry.isIntersecting && entry.intersectionRatio >= 0.75;

            if (isVisible) {
              item.removeAttribute("aria-hidden");
            } else {
              item.setAttribute("aria-hidden", "true");
            }
            if (link) link.tabIndex = isVisible ? 0 : -1;
          }
        },
        {
          root: viewport,
          rootMargin: "0px -20px",
          threshold: 0.75,
        },
      );

      for (const item of items) {
        item.setAttribute("aria-hidden", "true");
        const link = item.querySelector<HTMLAnchorElement>("a[href]");
        if (link) link.tabIndex = -1;
        observer.observe(item);
      }
    });

    return () => {
      active = false;
      observer?.disconnect();
    };
  };

  function handleFocusOut(event: FocusEvent): void {
    const viewport = event.currentTarget as HTMLDivElement;
    if (event.relatedTarget instanceof Node && viewport.contains(event.relatedTarget)) {
      return;
    }

    focusWithin = false;
  }
</script>

<SectionBlock {title}>
  <div
    class="relative overflow-hidden"
    data-testimonials-viewport
    data-focus-within={focusWithin}
    onfocusin={() => (focusWithin = true)}
    onfocusout={handleFocusOut}
    {@attach observeMarqueeItems}
  >
    <div
      class="from-background-inset pointer-events-none absolute inset-y-1 left-0 z-10 w-5 bg-linear-to-r to-transparent"
    ></div>
    <div
      class="from-background-inset pointer-events-none absolute inset-y-1 right-0 z-10 w-5 bg-linear-to-l to-transparent"
    ></div>
    <div class="marquee-row">
      <div class="marquee-track marquee-left">
        {#each firstTrack as tweet, index (`first-${tweet.id_str}-${index}`)}
          {@const itemId = `first-${tweet.id_str}-${index}`}
          <div class="flex-none" data-marquee-item={itemId}>
            <LandingContentCard
              card={{
                variant: "tweet",
                name: tweet.user.name,
                handle: tweet.user.screen_name,
                text: tweet.text,
                avatar: tweet.user.profile_image_url_https,
                verified: tweet.user.is_blue_verified || tweet.user.verified,
                tweetUrl: `https://x.com/${tweet.user.screen_name}/status/${tweet.id_str}`,
              }}
            />
          </div>
        {/each}
      </div>
    </div>

    <div class="marquee-row mt-4">
      <div class="marquee-track marquee-right">
        {#each secondTrack as tweet, index (`second-${tweet.id_str}-${index}`)}
          {@const itemId = `second-${tweet.id_str}-${index}`}
          <div class="flex-none" data-marquee-item={itemId}>
            <LandingContentCard
              card={{
                variant: "tweet",
                name: tweet.user.name,
                handle: tweet.user.screen_name,
                text: tweet.text,
                avatar: tweet.user.profile_image_url_https,
                verified: tweet.user.is_blue_verified || tweet.user.verified,
                tweetUrl: `https://x.com/${tweet.user.screen_name}/status/${tweet.id_str}`,
              }}
            />
          </div>
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
    --marquee-gap: 1rem;
    display: flex;
    width: max-content;
    gap: var(--marquee-gap);
    backface-visibility: hidden;
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

  [data-testimonials-viewport][data-focus-within="true"] .marquee-track {
    animation-play-state: paused;
  }

  @keyframes marquee-left {
    from {
      transform: translate3d(0, 0, 0);
    }

    to {
      transform: translate3d(calc(-50% - var(--marquee-gap) / 2), 0, 0);
    }
  }

  @keyframes marquee-right {
    from {
      transform: translate3d(calc(-50% - var(--marquee-gap) / 2), 0, 0);
    }

    to {
      transform: translate3d(0, 0, 0);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .marquee-track {
      animation: none;
    }
  }
</style>
