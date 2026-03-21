<script lang="ts">
  import type { Snippet } from "svelte";
  import { cn } from "$lib/utils/cn";
  import { resolve } from "$app/paths";

  type Props = {
    href: string;
    ariaLabel: string;
    target?: string;
    rel?: string;
    children?: Snippet;
    class?: string;
  };

  let {
    href,
    ariaLabel,
    target = "_blank",
    rel = "external noreferrer noopener",
    children,
    class: className = "",
  }: Props = $props();
</script>

<div class="bg-background-inset inset-shadow rounded-sm p-1">
  {#if href.startsWith("http") || href.startsWith("mailto")}
    <a
      {href}
      {target}
      rel="external {rel}"
      aria-label={ariaLabel}
      class={cn(
        "bg-background card flex size-6 items-center justify-center rounded-[calc(var(--radius-base)*1.25)]",
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
      class={cn(
        "bg-background card flex size-6 items-center justify-center rounded-[calc(var(--radius-base)*1.25)]",
        className,
      )}
    >
      {@render children?.()}
    </a>
  {/if}
</div>
