<script lang="ts">
  import { onDestroy, onMount, type Snippet } from "svelte";
  import { Dialog } from "bits-ui";
  import IconRenderer from "$lib/components/icons/IconRenderer.svelte";
  import { IconClose } from "$lib/components/icons/data";
  import MarkdownCardWrapper from "./MarkdownCardWrapper.svelte";
  import { MediaLightbox } from "./media-lightbox.svelte";
  import { copyFrame, prepareVideo, videoFrame } from "./media-readiness";

  type Props = {
    src: string;
    poster: string;
    label: string;
    width: number;
    height: number;
    children?: Snippet;
  };

  let { src, poster, label, width, height, children }: Props = $props();
  let video = $state<HTMLVideoElement>();
  let expandedVideo = $state<HTMLVideoElement>();
  let thumbnail = $state<HTMLDivElement>();
  let viewport = $state<HTMLDivElement>();
  let trigger = $state<HTMLButtonElement | null>(null);
  let closeButton = $state<HTMLButtonElement | null>(null);
  let overlay = $state<HTMLElement | null>(null);
  let content = $state<HTMLElement | null>(null);
  const aspectRatio = $derived(width / height);
  let currentTime = 0;
  let visible = false;
  let motionAllowed = false;
  let destroyed = false;
  let preparingVideo: HTMLVideoElement | undefined;
  let handoffFrame: HTMLElement | null = null;
  let placeholder: HTMLElement | null = null;

  function removePlaceholder() {
    placeholder?.remove();
    placeholder = null;
  }

  const lightbox = new MediaLightbox({
    elements: () => ({ thumbnail, viewport, overlay, content, trigger }),
    onRequest: () => {
      const source = lightbox.open ? expandedVideo : video;
      if (!lightbox.moving) {
        if (source && source !== preparingVideo && source.readyState >= 2 && !source.seeking) {
          currentTime = source.currentTime;
        }
        handoffFrame = placeholder ? copyFrame(placeholder, poster) : videoFrame(source, poster);
      }
      video?.pause();
      expandedVideo?.pause();
      removePlaceholder();
    },
    frame: () => {
      if (handoffFrame) {
        handoffFrame.setAttribute("aria-hidden", "true");
        handoffFrame.dataset.markdownVideoFlip = "";
      }
      return handoffFrame;
    },
    onMounted: (nextOpen, frame, signal) => {
      const destination = nextOpen ? expandedVideo : video;
      const host = nextOpen ? viewport : thumbnail;
      if (!destination || !host) return;
      preparingVideo = destination;
      // A frozen frame stays in the media box while a slow seek/load finishes.
      // It never keeps the modal mounted or traps focus after the close animation.
      const still = frame ?? handoffFrame;
      if (still) {
        placeholder = copyFrame(still, poster);
        placeholder.removeAttribute("data-markdown-video-flip");
        placeholder.setAttribute("aria-hidden", "true");
        placeholder.dataset.motionPlaceholder = "";
        placeholder.style.cssText =
          "position:absolute;inset:0;width:100%;height:100%;object-fit:contain;pointer-events:none;z-index:1";
        host.append(placeholder);
      }
      prepareVideo(destination, currentTime, signal, () => {
        preparingVideo = undefined;
        removePlaceholder();
        syncPlayback();
      });
    },
    onSettled: () => {
      handoffFrame = null;
      syncPlayback();
    },
  });

  function canPlay(source: HTMLVideoElement) {
    return (
      !destroyed &&
      motionAllowed &&
      document.visibilityState === "visible" &&
      !lightbox.moving &&
      source !== preparingVideo &&
      source === (lightbox.open ? expandedVideo : video) &&
      (lightbox.open || visible)
    );
  }

  function syncPlayback() {
    for (const source of [video, expandedVideo]) {
      if (!source) continue;
      if (!canPlay(source)) {
        source.pause();
      } else if (source.paused) {
        void source
          .play()
          .then(() => {
            // A play promise can resolve after a close, scroll, or tab switch.
            if (!canPlay(source)) source.pause();
          })
          .catch(() => {
            // Autoplay can be denied; keep the poster/frame available.
          });
      }
    }
  }

  function changeOpen(value: boolean) {
    lightbox.changeOpen(value);
  }

  onMount(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    motionAllowed = !reducedMotion.matches;
    const disconnect = lightbox.connect();
    const respectMotionPreference = () => {
      motionAllowed = !reducedMotion.matches;
      syncPlayback();
    };
    const observer = new IntersectionObserver(
      (entries) => {
        const latest = entries.at(-1);
        if (!latest) return;
        visible = latest.isIntersecting && latest.intersectionRatio >= 0.25;
        syncPlayback();
      },
      { threshold: [0, 0.25] },
    );
    if (thumbnail) observer.observe(thumbnail);
    reducedMotion.addEventListener("change", respectMotionPreference);
    document.addEventListener("visibilitychange", syncPlayback);
    return () => {
      disconnect();
      observer.disconnect();
      reducedMotion.removeEventListener("change", respectMotionPreference);
      document.removeEventListener("visibilitychange", syncPlayback);
    };
  });

  onDestroy(() => {
    destroyed = true;
    lightbox.destroy();
    removePlaceholder();
    video?.pause();
    expandedVideo?.pause();
  });
</script>

<Dialog.Root bind:open={() => lightbox.open, changeOpen}>
  <MarkdownCardWrapper class="markdown-media">
    <div bind:this={thumbnail} data-motion-clip class="relative overflow-hidden rounded-xl shadow-md">
      <video
        bind:this={video}
        {poster}
        {width}
        {height}
        aria-label={label}
        data-motion-video="inline"
        loop
        muted
        playsinline
        preload="none"
        class="bg-card block h-auto w-full"
        class:invisible={lightbox.open || lightbox.moving}
      >
        <source {src} type="video/mp4" />
        {@render children?.()}
      </video>
      <Dialog.Trigger
        bind:ref={trigger}
        aria-label={`View full size: ${label}`}
        data-motion-expand
        class="inset-ring-ring/50 absolute inset-0 cursor-zoom-in rounded-xl inset-ring-0 transition-shadow duration-150 ease-in-out outline-none focus-visible:inset-ring-3 motion-reduce:transition-none forced-colors:focus-visible:outline-2 forced-colors:focus-visible:-outline-offset-2 forced-colors:focus-visible:outline-[Highlight] forced-colors:focus-visible:outline-solid"
      />
    </div>
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
      data-markdown-video-dialog
      data-moving={lightbox.moving}
      onOpenAutoFocus={(event) => {
        event.preventDefault();
        closeButton?.focus({ preventScroll: true });
      }}
      onCloseAutoFocus={(event) => {
        event.preventDefault();
      }}
      class="dark pointer-events-none! fixed inset-0 z-[100] grid place-items-center bg-transparent px-3 py-(--media-inset) outline-none"
      style={`--media-inset: max(4.5rem, calc(env(safe-area-inset-top) + 3.5rem), calc(env(safe-area-inset-bottom) + 0.75rem)); opacity: ${lightbox.opacity}`}
    >
      <Dialog.Title class="sr-only">{label}</Dialog.Title>
      <Dialog.Description class="sr-only">Press Escape or click outside the video to close.</Dialog.Description>
      <Dialog.Close
        bind:ref={closeButton}
        aria-label="Close video"
        class="focus-visible:ring-ring/50 hover:bg-accent-foreground/10 pointer-events-auto fixed top-[max(1rem,env(safe-area-inset-top))] right-[max(1rem,env(safe-area-inset-right))] z-10 flex size-11 items-center justify-center rounded-md text-white opacity-80 transition-[opacity,box-shadow,background-color] duration-150 ease-in-out outline-none hover:opacity-100 focus-visible:opacity-100 focus-visible:ring-3 motion-reduce:transition-none forced-colors:focus-visible:outline-2 forced-colors:focus-visible:outline-offset-2 forced-colors:focus-visible:outline-[Highlight] forced-colors:focus-visible:outline-solid"
      >
        <IconRenderer icon={IconClose} size={20} />
      </Dialog.Close>
      <div
        bind:this={viewport}
        class="pointer-events-auto relative w-[min(calc(100vw-1.5rem),calc((100dvh-2*var(--media-inset))*var(--image-ratio)))] overflow-hidden rounded-xl shadow-lg"
        style:--image-ratio={aspectRatio}
        style:aspect-ratio={aspectRatio}
        style:opacity={lightbox.moving ? 0 : 1}
      >
        <video
          bind:this={expandedVideo}
          {poster}
          {width}
          {height}
          aria-label={label}
          data-motion-video="expanded"
          loop
          muted
          playsinline
          preload="auto"
          class="bg-card block size-full object-contain"
        >
          <source {src} type="video/mp4" />
        </video>
      </div>
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
