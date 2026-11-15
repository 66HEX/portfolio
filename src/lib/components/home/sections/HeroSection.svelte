<script lang="ts">
  import * as Card from "$lib/components/ui/card";
  import * as Avatar from "$lib/components/ui/avatar";
  import { onMount, type ComponentProps } from "svelte";
  import { browser } from "$app/environment";
  import type { HomepageContent } from "$lib/homepage";
  import SectionBlock from "$lib/components/layout/SectionBlock.svelte";
  import ThemeToggle from "$lib/components/ui/ThemeToggle.svelte";
  import { themeStore } from "$lib/stores/theme.svelte";
  import CardWrapper from "$lib/components/layout/CardWrapper.svelte";
  import { cssColorToHex } from "$lib/utils/color";
  import { createKeyPressSound } from "$lib/features/hero/key-press-sound";

  import { portfolio } from "$portfolio/config";

  type KeycapComponent = typeof import("$lib/features/hero/components/KeycapLogo.svelte").default;

  type Props = {
    hero: HomepageContent["hero"];
    profile: HomepageContent["profile"];
    onKeyPress?: ComponentProps<KeycapComponent>["onKeyPress"];
  };

  let { hero, profile, onKeyPress }: Props = $props();

  let KeycapLogo = $state<KeycapComponent>();
  let shaderReady = $state(false);
  let avatarStatus = $state<"loading" | "loaded" | "error">("loading");
  let keySound: ReturnType<typeof createKeyPressSound> | undefined;

  function handleKeyPress(event: Parameters<NonNullable<Props["onKeyPress"]>>[0]): void {
    keySound?.play();
    onKeyPress?.(event);
  }

  function handleShaderError(error: unknown): void {
    shaderReady = false;
    console.error("[hero] Shader initialization failed:", error);
  }

  onMount(() => {
    if (!portfolio.hero.shader.enabled) return;

    let active = true;
    if (portfolio.hero.shader.sound.enabled) {
      keySound = createKeyPressSound(portfolio.hero.shader.sound);
    }
    // Install Pixi's static uniform sync before loading the generated component.
    void import("pixi.js/unsafe-eval")
      .then(() => import("$lib/features/hero/components/KeycapLogo.svelte"))
      .then((module) => {
        if (active) KeycapLogo = module.default;
      })
      .catch((error: unknown) => {
        if (active) handleShaderError(error);
      });

    return () => {
      active = false;
      keySound?.destroy();
      keySound = undefined;
    };
  });

  const keycapColors = $derived.by(() => {
    const theme = themeStore.current;
    const fallback = {
      backgroundColor: theme === "dark" ? "#161719" : "#f4f4f4",
      keyColor: "#1c1c1f",
      logoColor: theme === "dark" ? "#B8A8FF" : "#857AFF",
      legendColor: "#ffffff",
      lightColor: "#ffffff",
    };

    if (!browser) {
      return fallback;
    }

    const styles = getComputedStyle(document.documentElement);
    return {
      backgroundColor: cssColorToHex(styles.getPropertyValue("--background"), fallback.backgroundColor),
      keyColor: cssColorToHex(styles.getPropertyValue("--card-dark"), fallback.keyColor),
      logoColor: cssColorToHex(styles.getPropertyValue("--primary"), fallback.logoColor),
      legendColor: cssColorToHex(styles.getPropertyValue("--primary-foreground"), fallback.legendColor),
      lightColor: cssColorToHex(styles.getPropertyValue("--primary-foreground"), fallback.lightColor),
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
            inert={!shaderReady}
            aria-hidden="true"
          >
            {#if KeycapLogo}
              <KeycapLogo
                svgSource={portfolio.hero.shader.svgSource}
                fontUrl={portfolio.hero.shader.fontUrl}
                scale={portfolio.hero.shader.scale}
                offsetX={portfolio.hero.shader.offsetX}
                offsetY={portfolio.hero.shader.offsetY}
                panX={portfolio.hero.shader.panX}
                panY={portfolio.hero.shader.panY}
                logoScale={portfolio.hero.shader.logoScale}
                legendScale={portfolio.hero.shader.legendScale}
                letterSpacing={portfolio.hero.shader.letterSpacing}
                {...keycapColors}
                roughness={portfolio.hero.shader.roughness}
                lightAngle={portfolio.hero.shader.lightAngle}
                lightElevation={portfolio.hero.shader.lightElevation}
                lightIntensity={portfolio.hero.shader.lightIntensity}
                lightSize={portfolio.hero.shader.lightSize}
                environmentRotation={portfolio.hero.shader.environmentRotation}
                environmentIntensity={portfolio.hero.shader.environmentIntensity}
                exposure={portfolio.hero.shader.exposure}
                interactive={portfolio.hero.shader.interactive}
                class="h-full w-full"
                onKeyPress={handleKeyPress}
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
