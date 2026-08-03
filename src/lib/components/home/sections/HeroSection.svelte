<script lang="ts">
  import { browser } from "$app/environment";
  import type { HomepageContent } from "$lib/content/homepage-content";
  import SectionBlock from "$lib/components/layout/SectionBlock.svelte";
  import ThemeToggle from "$lib/components/ui/ThemeToggle.svelte";
  import { LiquidMetal } from "$lib/motion-core";
  import { themeStore } from "$lib/stores/theme.svelte";

  type Props = {
    hero: HomepageContent["hero"];
    profile: HomepageContent["profile"];
  };

  let { hero, profile }: Props = $props();

  const liquidMetalColors = $derived.by(() => {
    const theme = themeStore.current;
    const fallbackBackground = theme === "dark" ? "#17181A" : "#f8f8f8";
    const fallbackAccent = "#ff601a";

    if (!browser) {
      return { accent: fallbackAccent, background: fallbackBackground };
    }

    const styles = getComputedStyle(document.documentElement);
    return {
      accent: styles.getPropertyValue("--accent").trim() || fallbackAccent,
      background: styles.getPropertyValue("--background-inset").trim() || fallbackBackground,
    };
  });
</script>

<SectionBlock>
  <div class="bg-background-inset card-outer relative h-54 w-full rounded-lg">
    <div class="card absolute inset-1.5 overflow-hidden rounded-md">
      <LiquidMetal
        color={liquidMetalColors.accent}
        backgroundColor={liquidMetalColors.background}
        chromaticAberration={0}
        scale={1}
        class="h-full w-full"
        blur={0.5}
      />
    </div>

    <div class="bg-background-inset card-outer absolute bottom-0 left-4 z-5 size-32 translate-y-1/2 rounded-full p-1.5">
      <img
        class="card rounded-full object-cover"
        src={hero.avatarSrc}
        alt={hero.avatarAlt}
        width="460"
        height="460"
        decoding="async"
        fetchpriority="high"
      />
    </div>
  </div>
</SectionBlock>

<div class="relative mb-8 flex w-full items-center justify-between gap-4 pr-4 pl-42">
  <header class="flex min-w-0 flex-col items-start justify-start gap-1">
    <h1 class="text-foreground font-display text-lg leading-none">{profile.name}</h1>
    <p class="text-foreground-muted text-xs leading-none">{profile.role}</p>
  </header>

  <ThemeToggle class="size-6" />
</div>
