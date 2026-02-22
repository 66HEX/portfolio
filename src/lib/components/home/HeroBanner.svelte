<script lang="ts">
  import type { Component } from "svelte";
  import { onMount } from "svelte";

  type Props = {
    avatarSrc: string;
    avatarAlt: string;
  };

  const GLITTER_COLOR_TOKEN = "--hero-banner-glitter-color";
  const DEFAULT_GLITTER_COLOR = "#202229";

  let { avatarSrc, avatarAlt }: Props = $props();
  let glitterColor = $state(DEFAULT_GLITTER_COLOR);
  let GlitterClothComponent = $state<Component<{ color: string }> | null>(null);

  const readGlitterColor = (): string => {
    if (typeof window === "undefined") return DEFAULT_GLITTER_COLOR;
    const value = getComputedStyle(document.documentElement).getPropertyValue(GLITTER_COLOR_TOKEN).trim();
    return value || DEFAULT_GLITTER_COLOR;
  };

  onMount(() => {
    const root = document.documentElement;
    glitterColor = readGlitterColor();
    let idleCallbackId: number | null = null;
    let timeoutId: number | null = null;

    const observer = new MutationObserver(() => {
      glitterColor = readGlitterColor();
    });

    const loadGlitterCloth = async (): Promise<void> => {
      const module = await import("./GlitterCloth/GlitterCloth.svelte");
      GlitterClothComponent = module.default;
    };

    if (typeof window.requestIdleCallback === "function") {
      idleCallbackId = window.requestIdleCallback(
        () => {
          void loadGlitterCloth();
        },
        { timeout: 1200 },
      );
    } else {
      timeoutId = setTimeout(() => {
        void loadGlitterCloth();
      }, 250);
    }

    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => {
      observer.disconnect();
      if (idleCallbackId !== null && typeof window.cancelIdleCallback === "function") {
        window.cancelIdleCallback(idleCallbackId);
      }
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
    };
  });
</script>

<div class="bg-background border-gray-alpha-100 input-highlight relative h-38 w-full rounded-md border sm:h-54">
  <div class="bg-background absolute inset-0 overflow-hidden rounded-md">
    {#if GlitterClothComponent}
      <GlitterClothComponent color={glitterColor} />
    {/if}
  </div>
  <div
    class="bg-background input-highlight absolute! bottom-0 left-4 z-500 size-24 translate-y-1/2 rounded-full sm:size-32"
  >
    <div class="border-background absolute inset-0 overflow-hidden rounded-full border-2 p-px">
      <img
        class="button-highlight rounded-full object-cover"
        src={avatarSrc}
        alt={avatarAlt}
        width="460"
        height="460"
        decoding="async"
        fetchpriority="high"
      />
    </div>
  </div>
</div>
