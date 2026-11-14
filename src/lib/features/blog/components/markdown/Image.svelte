<script lang="ts">
  import { onDestroy, onMount, tick } from "svelte";
  import type { HTMLImgAttributes } from "svelte/elements";
  import { Dialog } from "bits-ui";
  import IconRenderer from "$lib/components/icons/IconRenderer.svelte";
  import { IconClose } from "$lib/components/icons/data";
  import MarkdownCardWrapper from "./MarkdownCardWrapper.svelte";
  import { cn } from "$lib/utils";

  let { alt = "", class: className, ...restProps }: HTMLImgAttributes = $props();
  let thumbnail = $state<HTMLImageElement>();
  let viewport = $state<HTMLDivElement>();
  let overlay = $state<HTMLElement | null>(null);
  let content = $state<HTMLElement | null>(null);
  let zoomable = $state(false);
  let open = $state(false);
  let moving = $state(false);
  let dialogOpacity = $state(0);
  let previewSrc = $state("");
  let aspectRatio = $state(1);
  let requestedOpen = false;
  let operation = 0;
  let floatingImage: HTMLImageElement | null = null;
  let animations: Animation[] = [];

  function cancelAnimations() {
    for (const animation of animations) animation.cancel();
    animations = [];
  }

  function removeFloatingImage() {
    cancelAnimations();
    floatingImage?.remove();
    floatingImage = null;
  }

  function settleImmediately() {
    operation += 1;
    removeFloatingImage();
    moving = false;
    dialogOpacity = requestedOpen ? 1 : 0;
    open = requestedOpen;
  }

  function changeOpen(value: boolean) {
    if (value === requestedOpen) return;
    if (value) {
      if (!thumbnail) return;
      const src = thumbnail.currentSrc || thumbnail.getAttribute("src");
      if (!src) return;
      previewSrc = src;
      aspectRatio = thumbnail.naturalWidth / thumbnail.naturalHeight || 1;
    }
    requestedOpen = value;
    void moveTo(value);
  }

  async function moveTo(nextOpen: boolean) {
    const currentOperation = ++operation;
    const interruptedRect = floatingImage?.getBoundingClientRect();
    const fromOpacity = overlay ? Number(getComputedStyle(overlay).opacity) : 0;
    // Keep the current frame visible while an interrupted animation changes direction.
    if (floatingImage && interruptedRect) {
      Object.assign(floatingImage.style, {
        left: `${interruptedRect.left}px`,
        top: `${interruptedRect.top}px`,
        width: `${interruptedRect.width}px`,
        height: `${interruptedRect.height}px`,
        transform: "none",
      });
    }
    if (overlay) overlay.style.opacity = `${fromOpacity}`;
    if (content) content.style.opacity = `${fromOpacity}`;
    dialogOpacity = fromOpacity;
    cancelAnimations();

    const source = open ? viewport : thumbnail;
    const from = interruptedRect ?? source?.getBoundingClientRect();
    if (
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      !source ||
      !from?.width ||
      !from.height ||
      typeof source.animate !== "function"
    ) {
      settleImmediately();
      return;
    }

    const image = floatingImage ?? new Image();
    floatingImage = image;
    image.src = previewSrc;
    image.alt = "";
    image.setAttribute("aria-hidden", "true");
    image.dataset.markdownImageFlip = "";
    try {
      await image.decode();
    } catch {
      if (currentOperation === operation) settleImmediately();
      return;
    }
    if (currentOperation !== operation) return;

    if (nextOpen) {
      aspectRatio = image.naturalWidth / image.naturalHeight || 1;
      moving = true;
      open = true;
      await tick();
      if (currentOperation !== operation) return;
    }

    const to = (nextOpen ? viewport : thumbnail)?.getBoundingClientRect();
    if (!to?.width || !to.height) {
      settleImmediately();
      return;
    }

    Object.assign(image.style, {
      position: "fixed",
      left: `${to.left}px`,
      top: `${to.top}px`,
      width: `${to.width}px`,
      height: `${to.height}px`,
      maxWidth: "none",
      objectFit: "contain",
      transformOrigin: "top left",
      transform: "none",
      borderRadius: "var(--radius-xl)",
      boxShadow: "var(--shadow-lg)",
      pointerEvents: "none",
      zIndex: "90",
    });
    document.body.append(image);
    moving = true;

    try {
      const timing = {
        duration: nextOpen ? 300 : 240,
        easing: "cubic-bezier(0.22, 1, 0.36, 1)",
        fill: "both" as const,
      };
      animations.push(
        image.animate(
          [
            {
              transform: `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${from.width / to.width}, ${from.height / to.height})`,
            },
            { transform: "translate(0, 0) scale(1, 1)" },
          ],
          timing,
        ),
      );
      const fade = [{ opacity: fromOpacity }, { opacity: nextOpen ? 1 : 0 }];
      for (const layer of [overlay, content]) {
        if (layer) animations.push(layer.animate(fade, timing));
      }
      await Promise.all(animations.map((animation) => animation.finished));
    } catch {
      // Cancellation leaves the latest operation in control of the floating image.
    }
    if (currentOperation !== operation) return;

    open = nextOpen;
    moving = false;
    dialogOpacity = nextOpen ? 1 : 0;
    await tick();
    if (currentOperation === operation) removeFloatingImage();
  }

  onMount(() => {
    // Raw HTML links and Markdown links both retain their native click and keyboard behavior.
    zoomable = !!thumbnail && !thumbnail.closest("a, button");
    if (!zoomable) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const finishMovement = () => {
      if (floatingImage) settleImmediately();
    };
    window.addEventListener("resize", finishMovement);
    reducedMotion.addEventListener("change", finishMovement);
    return () => {
      window.removeEventListener("resize", finishMovement);
      reducedMotion.removeEventListener("change", finishMovement);
    };
  });

  onDestroy(() => {
    operation += 1;
    removeFloatingImage();
  });
</script>

<!-- Markdown images can appear inside paragraphs and links, so the wrapper must stay phrasing content. -->
<Dialog.Root bind:open={() => open, changeOpen}>
  <MarkdownCardWrapper as="span" class="markdown-media relative my-6 block">
    <img
      {...restProps}
      bind:this={thumbnail}
      {alt}
      data-slot="markdown-image"
      class={cn(
        "bg-card [a:focus-visible_&]:ring-ring/50 block h-auto w-full rounded-xl shadow-md transition-shadow duration-150 ease-in-out [a:focus-visible_&]:ring-3",
        className,
        (open || moving) && "invisible transition-none",
      )}
    />
    {#if zoomable}
      <Dialog.Trigger
        aria-label={alt ? `View full size: ${alt}` : "View image full size"}
        class="inset-ring-ring/50 absolute inset-1 cursor-zoom-in rounded-xl inset-ring-0 transition-shadow duration-150 ease-in-out outline-none focus-visible:inset-ring-3 motion-reduce:transition-none forced-colors:focus-visible:outline-2 forced-colors:focus-visible:-outline-offset-2 forced-colors:focus-visible:outline-[Highlight] forced-colors:focus-visible:outline-solid"
      />
    {/if}
  </MarkdownCardWrapper>

  <Dialog.Portal>
    <Dialog.Overlay
      bind:ref={overlay}
      style={`opacity: ${dialogOpacity}`}
      onclick={() => changeOpen(false)}
      class="fixed inset-0 z-50 bg-black/80"
    />
    <Dialog.Content
      bind:ref={content}
      data-markdown-image-dialog
      data-moving={moving}
      class="dark pointer-events-none! fixed inset-0 z-[100] grid place-items-center bg-transparent px-3 pt-(--image-top) pb-3 outline-none"
      style={`--image-top: max(4.5rem, calc(env(safe-area-inset-top) + 3.5rem)); opacity: ${dialogOpacity}`}
    >
      <Dialog.Title class="sr-only">{alt || "Image preview"}</Dialog.Title>
      <Dialog.Description class="sr-only">Press Escape or click outside the image to close.</Dialog.Description>
      <Dialog.Close
        aria-label="Close image"
        class="focus-visible:ring-ring/50 pointer-events-auto fixed top-[max(1rem,env(safe-area-inset-top))] right-[max(1rem,env(safe-area-inset-right))] z-10 flex size-11 items-center justify-center rounded-md text-white opacity-80 transition-[opacity,box-shadow] duration-150 ease-in-out outline-none hover:opacity-100 focus-visible:opacity-100 focus-visible:ring-3 motion-reduce:transition-none forced-colors:focus-visible:outline-2 forced-colors:focus-visible:outline-offset-2 forced-colors:focus-visible:outline-[Highlight] forced-colors:focus-visible:outline-solid"
      >
        <IconRenderer icon={IconClose} size={20} />
      </Dialog.Close>
      <div
        bind:this={viewport}
        class="pointer-events-auto w-[min(calc(100vw-1.5rem),calc((100svh-var(--image-top)-0.75rem)*var(--image-ratio)))] overflow-hidden rounded-xl shadow-lg"
        style:--image-ratio={aspectRatio}
        style:aspect-ratio={aspectRatio}
        style:opacity={moving ? 0 : 1}
      >
        <img
          src={previewSrc}
          {alt}
          class="block size-full object-contain"
          onload={({ currentTarget }) => {
            if (currentTarget instanceof HTMLImageElement) {
              aspectRatio = currentTarget.naturalWidth / currentTarget.naturalHeight || 1;
            }
          }}
        />
      </div>
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
