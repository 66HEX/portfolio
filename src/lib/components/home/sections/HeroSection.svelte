<script lang="ts">
  import * as Card from "$lib/components/ui/card";
  import * as Avatar from "$lib/components/ui/avatar";
  import { onMount } from "svelte";
  import { browser } from "$app/environment";
  import type { HomepageContent } from "$lib/homepage";
  import SectionBlock from "$lib/components/layout/SectionBlock.svelte";
  import ThemeToggle from "$lib/components/ui/ThemeToggle.svelte";
  import { themeStore } from "$lib/stores/theme.svelte";
  import CardWrapper from "$lib/components/layout/CardWrapper.svelte";
  import { cssColorToHex } from "$lib/utils/color";

  import { portfolio } from "$portfolio/config";

  type Props = {
    hero: HomepageContent["hero"];
    profile: HomepageContent["profile"];
  };

  let { hero, profile }: Props = $props();

  let LiquidGlass = $state<typeof import("$lib/features/hero/components/LiquidGlass.svelte").default>();
  let shaderReady = $state(false);
  let avatarStatus = $state<"loading" | "loaded" | "error">("loading");

  function handleShaderError(error: unknown): void {
    shaderReady = false;
    console.error("[hero] Shader initialization failed:", error);
  }

  onMount(() => {
    if (!portfolio.hero.shader.enabled) return;

    let active = true;
    void import("$lib/features/hero/components/LiquidGlass.svelte")
      .then((module) => {
        if (active) LiquidGlass = module.default;
      })
      .catch((error: unknown) => {
        if (active) handleShaderError(error);
      });

    return () => {
      active = false;
    };
  });

  const liquidGlassColors = $derived.by(() => {
    const theme = themeStore.current;
    const fallbackBackground = theme === "dark" ? "#0a0a0a" : "#ffffff";
    const fallbackAccent = theme === "dark" ? "#d4d4d4" : "#404040";

    if (!browser) {
      return { accent: fallbackAccent, background: fallbackBackground };
    }

    const styles = getComputedStyle(document.documentElement);
    return {
      accent: cssColorToHex(styles.getPropertyValue("--primary"), fallbackAccent),
      background: cssColorToHex(styles.getPropertyValue("--background"), fallbackBackground),
    };
  });
</script>

<SectionBlock>
  <div class="relative h-48 w-full">
    <CardWrapper class="relative h-full">
      <Card.Root class="absolute inset-1 gap-0 p-0">
        {#if portfolio.hero.shader.enabled}
          <div
            class="absolute inset-0 overflow-hidden transition-opacity duration-500 motion-reduce:transition-none"
            class:opacity-0={!shaderReady}
            aria-hidden="true"
          >
            {#if LiquidGlass}
              <LiquidGlass
                color1={liquidGlassColors.accent}
                color2={liquidGlassColors.background}
                chromaticAberration={portfolio.hero.shader.chromaticAberration}
                scale={portfolio.hero.shader.scale}
                class="h-full w-full"
                blur={portfolio.hero.shader.blur}
                grain={portfolio.hero.shader.grain}
                onReady={() => (shaderReady = true)}
                onError={handleShaderError}
              />
            {/if}
          </div>
        {/if}
      </Card.Root>
    </CardWrapper>
    <CardWrapper class="absolute bottom-0 left-4 z-5 size-28 translate-y-1/2 rounded-full bg-[#EEE] dark:bg-[#27272A]">
      <Avatar.Root class="h-full w-full shadow-md" loadingStatus={avatarStatus}>
        {#if avatarStatus === "error"}
          <Avatar.Fallback class="text-2xl"
            >{profile.name
              .split(/\s+/)
              .map((part) => part[0])
              .slice(0, 2)
              .join("")}</Avatar.Fallback
          >
        {:else}
          <img
            src={hero.avatarSrc}
            alt={hero.avatarAlt}
            class="aspect-square size-full rounded-full object-cover"
            width="460"
            height="460"
            loading="eager"
            decoding="async"
            fetchpriority="high"
            onload={() => (avatarStatus = "loaded")}
            onerror={() => (avatarStatus = "error")}
          />
        {/if}
      </Avatar.Root>
    </CardWrapper>
  </div>
</SectionBlock>

<div class="relative mb-8 flex w-full items-center justify-between gap-4 pr-4 pl-38">
  <header class="flex min-w-0 flex-col items-start justify-start gap-1">
    <h1 class="text-foreground font-display text-lg leading-none font-medium tracking-tight">{profile.name}</h1>
    <p class="text-muted-foreground text-xs leading-none">{profile.role}</p>
  </header>

  <ThemeToggle />
</div>
