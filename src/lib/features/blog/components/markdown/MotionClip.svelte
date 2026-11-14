<script lang="ts">
  import { onDestroy, onMount, tick, type Snippet } from "svelte";
  import { Dialog } from "bits-ui";
  import IconRenderer from "$lib/components/icons/IconRenderer.svelte";
  import { IconClose } from "$lib/components/icons/data";
  import MarkdownCardWrapper from "./MarkdownCardWrapper.svelte";

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
  let overlay = $state<HTMLElement | null>(null);
  let content = $state<HTMLElement | null>(null);
  let open = $state(false);
  let moving = $state(false);
  let dialogOpacity = $state(0);
  const aspectRatio = $derived(width / height);
  let requestedOpen = false;
  let currentTime = 0;
  let playbackWanted = false;
  let autoplayPending = true;
  let operation = 0;
  let restoreFocus: HTMLElement | null = null;
  let floatingFrame: HTMLCanvasElement | HTMLImageElement | null = null;
  let animations: Animation[] = [];
  let pendingMedia: AbortController | null = null;

  function activeVideo() {
    return open ? expandedVideo : video;
  }

  async function playActive() {
    const source = activeVideo();
    if (!source || moving || !playbackWanted) return;
    // Only the visible player may run. The other one holds its last rendered frame.
    (source === video ? expandedVideo : video)?.pause();
    try {
      await source.play();
    } catch {
      if (source === activeVideo() && !moving) {
        playbackWanted = false;
      }
    }
  }

  function startAutoplay() {
    if (!autoplayPending) return;
    autoplayPending = false;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    playbackWanted = true;
    if (!moving) void playActive();
  }

  function cancelAnimations() {
    for (const animation of animations) animation.cancel();
    animations = [];
  }

  function removeFloatingFrame() {
    cancelAnimations();
    floatingFrame?.remove();
    floatingFrame = null;
  }

  function waitForMedia(source: HTMLVideoElement, event: string, signal: AbortSignal) {
    return new Promise<void>((resolve) => {
      if (signal.aborted) return resolve();
      const finish = () => {
        clearTimeout(timeout);
        source.removeEventListener(event, finish);
        source.removeEventListener("error", finish);
        signal.removeEventListener("abort", finish);
        resolve();
      };
      const timeout = window.setTimeout(finish, 2000);
      source.addEventListener(event, finish, { once: true });
      source.addEventListener("error", finish, { once: true });
      signal.addEventListener("abort", finish, { once: true });
    });
  }

  async function prepareVideo(source: HTMLVideoElement | undefined, signal: AbortSignal) {
    if (!source || signal.aborted) return;
    source.preload = "auto";
    if (source.readyState < 1) {
      const ready = waitForMedia(source, "loadedmetadata", signal);
      if (source.networkState === HTMLMediaElement.NETWORK_EMPTY) source.load();
      await ready;
    }
    if (signal.aborted || source.readyState < 1) return;
    if (Math.abs(source.currentTime - currentTime) > 0.01) {
      const sought = waitForMedia(source, "seeked", signal);
      source.currentTime = Math.min(currentTime, source.duration || currentTime);
      await sought;
    } else if (source.readyState < 2) {
      await waitForMedia(source, "loadeddata", signal);
    }
  }

  function snapshot(source: HTMLVideoElement | undefined) {
    if (source && source.readyState >= 2) {
      const canvas = document.createElement("canvas");
      canvas.width = source.videoWidth;
      canvas.height = source.videoHeight;
      const context = canvas.getContext("2d");
      if (context) {
        context.drawImage(source, 0, 0, canvas.width, canvas.height);
        canvas.setAttribute("aria-hidden", "true");
        canvas.dataset.markdownVideoFlip = "";
        return canvas;
      }
    }
    // Before the first video frame has loaded, the thumbnail is the poster itself.
    const image = new Image();
    image.src = poster;
    image.alt = "";
    image.setAttribute("aria-hidden", "true");
    image.dataset.markdownVideoFlip = "";
    return image;
  }

  function changeOpen(value: boolean) {
    if (value === requestedOpen) return;
    if (value) {
      if (!thumbnail) return;
      restoreFocus = trigger;
    }
    requestedOpen = value;
    void moveTo(value);
    // Opening before the first intersection should transfer autoplay intent too.
    if (value) startAutoplay();
  }

  async function moveTo(nextOpen: boolean, immediate = false) {
    const currentOperation = ++operation;
    pendingMedia?.abort();
    const controller = new AbortController();
    pendingMedia = controller;
    const source = activeVideo();
    if (!moving && source) {
      currentTime = source.currentTime;
      playbackWanted = !source.paused;
    }
    const interruptedRect = floatingFrame?.getBoundingClientRect();
    const from = interruptedRect ?? (open ? viewport : thumbnail)?.getBoundingClientRect();
    const fromOpacity = overlay ? Number(getComputedStyle(overlay).opacity) : 0;
    // Freeze the actual current video frame, including when a transition reverses.
    const frame = floatingFrame ?? snapshot(source);
    floatingFrame = frame;
    if (interruptedRect) {
      Object.assign(frame.style, {
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
    moving = true;
    video?.pause();
    expandedVideo?.pause();
    if (nextOpen) open = true;
    await tick();
    if (currentOperation !== operation) return;

    const destination = nextOpen ? expandedVideo : video;
    const prepared = prepareVideo(destination, controller.signal);
    const to = (nextOpen ? viewport : thumbnail)?.getBoundingClientRect();
    const animate =
      !immediate &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches &&
      from?.width &&
      from.height &&
      to?.width &&
      to.height &&
      typeof frame.animate === "function";

    if (animate && from && to) {
      Object.assign(frame.style, {
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
      document.body.append(frame);
      const timing = {
        duration: nextOpen ? 300 : 240,
        easing: "cubic-bezier(0.22, 1, 0.36, 1)",
        fill: "both" as const,
      };
      animations.push(
        frame.animate(
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
      try {
        await Promise.all(animations.map((animation) => animation.finished));
      } catch {
        // A newer operation owns the interrupted frame and playback state.
      }
    }
    await prepared;
    if (currentOperation !== operation) return;
    open = nextOpen;
    moving = false;
    dialogOpacity = nextOpen ? 1 : 0;
    await tick();
    if (currentOperation !== operation) return;
    removeFloatingFrame();
    if (playbackWanted) void playActive();
  }

  onMount(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const finishMovement = () => {
      if (moving) void moveTo(requestedOpen, true);
    };
    const respectMotionPreference = () => {
      if (reducedMotion.matches) {
        playbackWanted = false;
        video?.pause();
        expandedVideo?.pause();
      }
      finishMovement();
    };
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        startAutoplay();
      },
      { threshold: 0.25 },
    );
    if (thumbnail) observer.observe(thumbnail);
    window.addEventListener("resize", finishMovement);
    reducedMotion.addEventListener("change", respectMotionPreference);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", finishMovement);
      reducedMotion.removeEventListener("change", respectMotionPreference);
    };
  });

  onDestroy(() => {
    operation += 1;
    pendingMedia?.abort();
    removeFloatingFrame();
    video?.pause();
    expandedVideo?.pause();
  });
</script>

<Dialog.Root bind:open={() => open, changeOpen}>
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
        class:invisible={open || moving}
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
      style={`opacity: ${dialogOpacity}`}
      onclick={() => changeOpen(false)}
      class="fixed inset-0 z-50 bg-black/80"
    />
    <Dialog.Content
      bind:ref={content}
      data-markdown-video-dialog
      data-moving={moving}
      onCloseAutoFocus={(event) => {
        event.preventDefault();
        if (!requestedOpen) (restoreFocus?.isConnected ? restoreFocus : trigger)?.focus({ preventScroll: true });
      }}
      class="dark pointer-events-none! fixed inset-0 z-[100] grid place-items-center bg-transparent px-3 pt-(--image-top) pb-3 outline-none"
      style={`--image-top: max(4.5rem, calc(env(safe-area-inset-top) + 3.5rem)); opacity: ${dialogOpacity}`}
    >
      <Dialog.Title class="sr-only">{label}</Dialog.Title>
      <Dialog.Description class="sr-only">Press Escape or click outside the video to close.</Dialog.Description>
      <Dialog.Close
        aria-label="Close video"
        class="focus-visible:ring-ring/50 pointer-events-auto fixed top-[max(1rem,env(safe-area-inset-top))] right-[max(1rem,env(safe-area-inset-right))] z-10 flex size-11 items-center justify-center rounded-md text-white opacity-80 transition-[opacity,box-shadow] duration-150 ease-in-out outline-none hover:opacity-100 focus-visible:opacity-100 focus-visible:ring-3 motion-reduce:transition-none forced-colors:focus-visible:outline-2 forced-colors:focus-visible:outline-offset-2 forced-colors:focus-visible:outline-[Highlight] forced-colors:focus-visible:outline-solid"
      >
        <IconRenderer icon={IconClose} size={20} />
      </Dialog.Close>
      <div
        bind:this={viewport}
        class="pointer-events-auto relative w-[min(calc(100vw-1.5rem),calc((100svh-var(--image-top)-0.75rem)*var(--image-ratio)))] overflow-hidden rounded-xl shadow-lg"
        style:--image-ratio={aspectRatio}
        style:aspect-ratio={aspectRatio}
        style:opacity={moving ? 0 : 1}
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
