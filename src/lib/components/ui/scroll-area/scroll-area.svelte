<script lang="ts">
  import { ScrollArea as ScrollAreaPrimitive } from "bits-ui";
  import { cn, type WithoutChild } from "$lib/utils.js";
  import { Scrollbar } from "./index.js";
  import type { Attachment } from "svelte/attachments";

  let {
    ref = $bindable(null),
    viewportRef = $bindable(null),
    class: className,
    orientation = "vertical",
    scrollbarXClasses = "",
    scrollbarYClasses = "",
    viewportProps = {},
    focusableWhenScrollable = false,
    fadeHorizontalEdges = false,
    children,
    ...restProps
  }: WithoutChild<ScrollAreaPrimitive.RootProps> & {
    orientation?: "vertical" | "horizontal" | "both" | undefined;
    scrollbarXClasses?: string | undefined;
    scrollbarYClasses?: string | undefined;
    viewportRef?: HTMLElement | null;
    viewportProps?: Omit<ScrollAreaPrimitive.ViewportProps, "children" | "child" | "ref">;
    focusableWhenScrollable?: boolean;
    fadeHorizontalEdges?: boolean;
  } = $props();

  let isScrollable = $state(false);
  let leftFade = $state(0);
  let rightFade = $state(0);

  const maskImage = $derived(
    fadeHorizontalEdges && (leftFade > 0 || rightFade > 0)
      ? `linear-gradient(to right, transparent, black ${leftFade}px, black calc(100% - ${rightFade}px), transparent)`
      : undefined,
  );

  const observeOverflow: Attachment<HTMLDivElement> = (viewport) => {
    if (!focusableWhenScrollable && !fadeHorizontalEdges) return;

    const horizontal = orientation !== "vertical";
    const vertical = orientation !== "horizontal";
    const fade = fadeHorizontalEdges && horizontal;

    const updateFade = () => {
      const maxScroll = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
      const offset =
        getComputedStyle(viewport).direction === "rtl" ? maxScroll + viewport.scrollLeft : viewport.scrollLeft;
      // Clamp overscroll and shrink the fade smoothly when approaching either edge.
      const left = Math.max(0, Math.min(offset, maxScroll));
      const right = maxScroll - left;
      // Scroll dimensions are rounded, while scrollLeft can contain fractional pixels.
      leftFade = left > 1 ? Math.min(24, left) : 0;
      rightFade = right > 1 ? Math.min(24, right) : 0;
    };

    const update = () => {
      isScrollable =
        (horizontal && viewport.scrollWidth > viewport.clientWidth) ||
        (vertical && viewport.scrollHeight > viewport.clientHeight);

      if (fade) updateFade();
      else leftFade = rightFade = 0;
    };

    const observer = new ResizeObserver(update);
    observer.observe(viewport);
    if (viewport.firstElementChild) observer.observe(viewport.firstElementChild);
    if (fade) viewport.addEventListener("scroll", updateFade, { passive: true });
    update();

    return () => {
      observer.disconnect();
      viewport.removeEventListener("scroll", updateFade);
    };
  };
</script>

<ScrollAreaPrimitive.Root bind:ref data-slot="scroll-area" class={cn("relative", className)} {...restProps}>
  <ScrollAreaPrimitive.Viewport
    {...viewportProps}
    bind:ref={viewportRef}
    data-slot="scroll-area-viewport"
    data-scrollable={focusableWhenScrollable && isScrollable ? "" : undefined}
    tabindex={focusableWhenScrollable ? (isScrollable ? 0 : -1) : viewportProps.tabindex}
    style={maskImage ? `mask-image: ${maskImage}; ${viewportProps.style ?? ""}` : viewportProps.style}
    class={cn(
      "focus-visible:ring-ring/50 size-full rounded-[inherit] transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:outline-1",
      viewportProps.class,
    )}
    {@attach observeOverflow}
  >
    {@render children?.()}
  </ScrollAreaPrimitive.Viewport>
  {#if orientation === "vertical" || orientation === "both"}
    <Scrollbar orientation="vertical" class={scrollbarYClasses} />
  {/if}
  {#if orientation === "horizontal" || orientation === "both"}
    <Scrollbar orientation="horizontal" class={scrollbarXClasses} />
  {/if}
  <ScrollAreaPrimitive.Corner />
</ScrollAreaPrimitive.Root>
