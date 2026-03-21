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

  export type TestimonialLandingCard = {
    variant: "testimonial";
    name: string;
    role: string;
    text: string;
    avatar: string;
  };

  export type LandingContentCardData = ProjectLandingCard | BlogLandingCard | TestimonialLandingCard;

  type Props = {
    card: LandingContentCardData;
    class?: string;
  };

  let { card, class: className = "" }: Props = $props();
</script>

<ContentCard
  class={cn(
    "relative flex flex-col",
    card.variant === "testimonial" ? "w-[min(20rem,calc(100vw-3.5rem))] flex-none" : "pb-12",
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
      <Tooltip content={card.ctaLabel} delay={120}>
        <IconLinkButton href={card.href} ariaLabel={`${card.ctaLabel}: ${card.title}`}>
          <IconLink size={16} />
        </IconLinkButton>
      </Tooltip>

      {#if card.githubHref}
        <Tooltip content={card.githubCtaLabel} delay={120}>
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

    <Tooltip class="absolute right-3 bottom-3" content={card.ctaLabel} delay={120}>
      <IconLinkButton href={card.href} ariaLabel={`${card.ctaLabel}: ${card.title}`} target="_self" rel="">
        <IconChevronRight size={16} />
      </IconLinkButton>
    </Tooltip>
  {:else}
    <div class="flex items-center gap-2">
      <div class="border-border size-9 rounded-full border">
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
      <CardHeading title={card.name} description={card.role} titleTag="p" descriptionClass="text-xs leading-none" />
    </div>

    <p class="text-foreground-muted mt-3 text-sm">
      {card.text}
    </p>
  {/if}
</ContentCard>
