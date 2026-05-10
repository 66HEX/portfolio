<script lang="ts">
  import IconChevronRight from "carbon-icons-svelte/lib/ChevronRight.svelte";
  import IconGithub from "carbon-icons-svelte/lib/LogoGithub.svelte";
  import IconLink from "carbon-icons-svelte/lib/Link.svelte";
  import Tooltip from "$lib/components/ui/Tooltip.svelte";
  import { cn } from "$lib/utils/cn";
  import CardHeading from "../../layout/CardHeading.svelte";
  import ContentCard from "../../layout/ContentCard.svelte";
  import IconLinkButton from "../../layout/IconLinkButton.svelte";

  export type ProjectLandingCard = {
    variant: "project";
    title: string;
    description: string;
    image: string;
    href: string;
    ctaLabel: string;
    githubHref?: string;
    githubCtaLabel: string;
  };

  export type BlogLandingCard = {
    variant: "blog";
    title: string;
    description: string;
    date: string;
    href: string;
    ctaLabel: string;
  };

  export type TweetLandingCard = {
    variant: "tweet";
    name: string;
    handle: string;
    text: string;
    avatar: string;
    verified: boolean;
    tweetUrl: string;
  };

  export type LandingContentCardData = ProjectLandingCard | BlogLandingCard | TweetLandingCard;

  type Props = {
    card: LandingContentCardData;
    class?: string;
  };

  let { card, class: className = "" }: Props = $props();
</script>

<ContentCard
  class={cn(
    "relative flex flex-col",
    card.variant === "tweet" ? "w-[min(20rem,calc(100vw-3.5rem))] flex-none" : "pb-12",
    className,
  )}
>
  {#if card.variant === "project"}
    <div class="h-52 overflow-hidden rounded-sm sm:h-100">
      <img
        src={card.image}
        alt={`${card.title} preview`}
        class="h-full w-full origin-center object-cover"
        loading="lazy"
        decoding="async"
        width="1280"
        height="720"
      />
    </div>

    <CardHeading title={card.title} description={card.description} class="mt-3" />

    <div class="absolute right-3 bottom-3 flex items-center gap-1">
      <Tooltip content={card.ctaLabel}>
        <IconLinkButton href={card.href} ariaLabel={`${card.ctaLabel}: ${card.title}`}>
          <IconLink size={16} />
        </IconLinkButton>
      </Tooltip>

      {#if card.githubHref}
        <Tooltip content={card.githubCtaLabel}>
          <IconLinkButton href={card.githubHref} ariaLabel={`${card.githubCtaLabel}: ${card.title}`}>
            <IconGithub width={16} height={16} />
          </IconLinkButton>
        </Tooltip>
      {/if}
    </div>
  {:else if card.variant === "blog"}
    <div class="text-foreground-muted text-xs leading-none">
      <time datetime={card.date}>{card.date}</time>
    </div>

    <CardHeading title={card.title} description={card.description} class="mt-3" titleClass="truncate" />

    <Tooltip class="absolute right-3 bottom-3" content={card.ctaLabel}>
      <IconLinkButton href={card.href} ariaLabel={`${card.ctaLabel}: ${card.title}`} target="_self" rel="">
        <IconChevronRight size={16} />
      </IconLinkButton>
    </Tooltip>
  {:else}
    <div class="flex items-start justify-between gap-2">
      <div class="flex min-w-0 items-center gap-2">
        <div class="border-border size-9 shrink-0 rounded-full border">
          <img
            src={card.avatar}
            alt={`${card.name} avatar`}
            class="rounded-full object-cover"
            loading="lazy"
            width="36"
            height="36"
            decoding="async"
          />
        </div>
        <div class="flex min-w-0 flex-col gap-0.5">
          <div class="flex items-center gap-1">
            <p class="text-foreground truncate text-base leading-none font-medium">{card.name}</p>
            {#if card.verified}
              <svg
                class="shrink-0 text-[#1d9bf0]"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                aria-label="Verified account"
                role="img"
              >
                <g>
                  <path
                    d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.66-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.33 2.19c-1.4-.46-2.91-.2-3.92.81s-1.26 2.52-.8 3.91c-1.31.67-2.2 1.91-2.2 3.34s.89 2.67 2.2 3.34c-.46 1.39-.21 2.9.8 3.91s2.52 1.26 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.68-.88 3.34-2.19c1.39.45 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34zm-11.71 4.2L6.8 12.46l1.41-1.42 2.26 2.26 4.8-5.23 1.47 1.36-6.2 6.77z"
                    fill="currentColor"
                  ></path>
                </g>
              </svg>
            {/if}
          </div>
          <p class="text-foreground-muted text-xs leading-none">@{card.handle}</p>
        </div>
      </div>

      <a
        href={card.tweetUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="View on X"
        class="text-foreground-muted hover:text-foreground shrink-0 transition-colors duration-150 ease-out"
      >
        <svg width="16" height="16" viewBox="0 0 1200 1227" aria-hidden="true" fill="currentColor">
          <path
            d="M714.163 519.284L1160.89 0H1055.03L667.137 450.887L357.328 0H0L468.492 681.821L0 1226.37H105.866L515.491 750.218L842.672 1226.37H1200L714.163 519.284ZM569.165 687.828L521.697 619.934L144.011 79.6944H306.615L611.412 515.685L658.88 583.579L1055.08 1150.3H892.476L569.165 687.828Z"
          />
        </svg>
      </a>
    </div>

    <p class="text-foreground-muted mt-3 text-sm">
      {card.text}
    </p>
  {/if}
</ContentCard>
