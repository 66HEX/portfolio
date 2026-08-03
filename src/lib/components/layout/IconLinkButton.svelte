<script lang="ts">
  import type { Snippet } from "svelte";
  import { cn } from "$lib/utils/cn";
  import { resolve } from "$app/paths";

  type Props = {
    href: string;
    ariaLabel: string;
    ariaDescribedBy?: string;
    target?: string;
    rel?: string;
    children?: Snippet;
    class?: string;
  };

  let {
    href,
    ariaLabel,
    ariaDescribedBy,
    target = "_blank",
    rel = "external noreferrer noopener",
    children,
    class: className = "",
  }: Props = $props();
</script>

<div class="bg-background-inset inset-shadow focus-ring-shell rounded-sm p-1">
  {#if href.startsWith("http") || href.startsWith("mailto")}
    <a
      {href}
      {target}
      rel="external {rel}"
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      class={cn(
        "hit-target-compact bg-background card flex size-6 items-center justify-center rounded-[calc(var(--radius-base)*1.25)] transition-[scale] duration-150 ease-out outline-none active:scale-[0.95] motion-reduce:transition-none motion-reduce:active:scale-100",
        className,
      )}
    >
      {@render children?.()}
    </a>
  {:else}
    <a
      href={resolve(href as "/")}
      {target}
      {rel}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      class={cn(
        "hit-target-compact bg-background card flex size-6 items-center justify-center rounded-[calc(var(--radius-base)*1.25)] transition-[scale] duration-150 ease-out outline-none active:scale-[0.95] motion-reduce:transition-none motion-reduce:active:scale-100",
        className,
      )}
    >
      {@render children?.()}
    </a>
  {/if}
</div>
