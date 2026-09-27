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
    children,
    ...restProps
  }: WithoutChild<ScrollAreaPrimitive.RootProps> & {
    orientation?: "vertical" | "horizontal" | "both" | undefined;
    scrollbarXClasses?: string | undefined;
    scrollbarYClasses?: string | undefined;
    viewportRef?: HTMLElement | null;
    viewportProps?: Omit<ScrollAreaPrimitive.ViewportProps, "children" | "child" | "ref">;
    focusableWhenScrollable?: boolean;
  } = $props();

  let isScrollable = $state(false);

  const observeOverflow: Attachment<HTMLDivElement> = (viewport) => {
    if (!focusableWhenScrollable) return;

    const horizontal = orientation !== "vertical";
    const vertical = orientation !== "horizontal";
    const update = () => {
      isScrollable =
        (horizontal && viewport.scrollWidth > viewport.clientWidth) ||
        (vertical && viewport.scrollHeight > viewport.clientHeight);
    };

    const observer = new ResizeObserver(update);
    observer.observe(viewport);
    if (viewport.firstElementChild) observer.observe(viewport.firstElementChild);
    update();

    return () => observer.disconnect();
  };
</script>

<ScrollAreaPrimitive.Root bind:ref data-slot="scroll-area" class={cn("relative", className)} {...restProps}>
  <ScrollAreaPrimitive.Viewport
    {...viewportProps}
    bind:ref={viewportRef}
    data-slot="scroll-area-viewport"
    data-scrollable={focusableWhenScrollable && isScrollable ? "" : undefined}
    tabindex={focusableWhenScrollable ? (isScrollable ? 0 : -1) : viewportProps.tabindex}
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
