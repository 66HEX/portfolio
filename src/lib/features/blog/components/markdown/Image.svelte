<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import type { HTMLImgAttributes } from "svelte/elements";
  import { Dialog } from "bits-ui";
  import IconRenderer from "$lib/components/icons/IconRenderer.svelte";
  import { IconClose } from "$lib/components/icons/data";
  import MarkdownCardWrapper from "./MarkdownCardWrapper.svelte";
  import { MediaLightbox } from "./media-lightbox.svelte";
  import { decodeImage } from "./media-readiness";
  import { cn } from "$lib/utils";

  let { alt = "", class: className, ...restProps }: HTMLImgAttributes = $props();
  let thumbnail = $state<HTMLImageElement>();
  let viewport = $state<HTMLDivElement>();
  let trigger = $state<HTMLButtonElement | null>(null);
  let closeButton = $state<HTMLButtonElement | null>(null);
  let overlay = $state<HTMLElement | null>(null);
  let content = $state<HTMLElement | null>(null);
  let zoomable = $state(false);
  let previewSrc = $state("");
  let aspectRatio = $state(1);

  const lightbox = new MediaLightbox({
    elements: () => ({ thumbnail, viewport, overlay, content, trigger }),
    frame: async (signal) => {
      const image = new Image();
      image.src = previewSrc;
      image.alt = "";
      image.setAttribute("aria-hidden", "true");
      image.dataset.markdownImageFlip = "";
      if (!(await decodeImage(image, signal))) return null;
      aspectRatio = image.naturalWidth / image.naturalHeight || 1;
      return image;
    },
  });

  function changeOpen(value: boolean) {
    if (value && !lightbox.requestedOpen) {
      if (!thumbnail) return;
      const src = thumbnail.currentSrc || thumbnail.getAttribute("src");
      if (!src) return;
      previewSrc = src;
      aspectRatio =
        thumbnail.naturalWidth / thumbnail.naturalHeight || Number(restProps.width) / Number(restProps.height) || 1;
    }
    lightbox.changeOpen(value);
  }

  onMount(() => {
    // Linked Markdown images retain their native click and keyboard behavior.
    zoomable = !!thumbnail && !thumbnail.closest("a, button");
    if (zoomable) return lightbox.connect();
  });

  onDestroy(() => lightbox.destroy());
</script>

<!-- Markdown images can appear inside paragraphs and links, so the wrapper must stay phrasing content. -->
<Dialog.Root bind:open={() => lightbox.open, changeOpen}>
  <MarkdownCardWrapper as="span" class="markdown-media relative my-6 block">
    <img
      {...restProps}
      bind:this={thumbnail}
      {alt}
      data-slot="markdown-image"
      class={cn(
        "bg-card [a:focus-visible_&]:ring-ring/50 block h-auto w-full rounded-xl shadow-md transition-shadow duration-150 ease-in-out [a:focus-visible_&]:ring-3",
        className,
        (lightbox.open || lightbox.moving) && "invisible transition-none",
      )}
    />
    {#if zoomable}
      <Dialog.Trigger
        bind:ref={trigger}
        aria-label={alt ? `View full size: ${alt}` : "View image full size"}
        class="inset-ring-ring/50 absolute inset-1 cursor-zoom-in rounded-xl inset-ring-0 transition-shadow duration-150 ease-in-out outline-none focus-visible:inset-ring-3 motion-reduce:transition-none forced-colors:focus-visible:outline-2 forced-colors:focus-visible:-outline-offset-2 forced-colors:focus-visible:outline-[Highlight] forced-colors:focus-visible:outline-solid"
      />
    {/if}
  </MarkdownCardWrapper>

  <Dialog.Portal>
    <Dialog.Overlay
      bind:ref={overlay}
      style={`opacity: ${lightbox.opacity}`}
      onclick={() => changeOpen(false)}
      class="fixed inset-0 z-50 bg-black/80"
    />
    <Dialog.Content
      bind:ref={content}
      onOpenAutoFocus={(event) => {
        event.preventDefault();
        closeButton?.focus({ preventScroll: true });
      }}
      onCloseAutoFocus={(event) => {
        event.preventDefault();
      }}
      data-markdown-image-dialog
      data-moving={lightbox.moving}
      class="dark pointer-events-none! fixed inset-0 z-[100] grid place-items-center bg-transparent px-3 py-(--media-inset) outline-none"
      style={`--media-inset: max(4.5rem, calc(env(safe-area-inset-top) + 3.5rem), calc(env(safe-area-inset-bottom) + 0.75rem)); opacity: ${lightbox.opacity}`}
    >
      <Dialog.Title class="sr-only">{alt || "Image preview"}</Dialog.Title>
      <Dialog.Description class="sr-only">Press Escape or click outside the image to close.</Dialog.Description>
      <Dialog.Close
        bind:ref={closeButton}
        aria-label="Close image"
        class="focus-visible:ring-ring/50 pointer-events-auto fixed top-[max(1rem,env(safe-area-inset-top))] right-[max(1rem,env(safe-area-inset-right))] z-10 flex size-11 items-center justify-center rounded-md text-white opacity-80 transition-[opacity,box-shadow] duration-150 ease-in-out outline-none hover:opacity-100 focus-visible:opacity-100 focus-visible:ring-3 motion-reduce:transition-none forced-colors:focus-visible:outline-2 forced-colors:focus-visible:outline-offset-2 forced-colors:focus-visible:outline-[Highlight] forced-colors:focus-visible:outline-solid"
      >
        <IconRenderer icon={IconClose} size={20} />
      </Dialog.Close>
      <div
        bind:this={viewport}
        class="pointer-events-auto w-[min(calc(100vw-1.5rem),calc((100dvh-2*var(--media-inset))*var(--image-ratio)))] overflow-hidden rounded-xl shadow-lg"
        style:--image-ratio={aspectRatio}
        style:aspect-ratio={aspectRatio}
        style:opacity={lightbox.moving ? 0 : 1}
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
