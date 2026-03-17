<script lang="ts">
  import type { Snippet } from "svelte";
  import { cn } from "$lib/utils/cn";

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

<div class="bg-background-inset inset-shadow border-border rounded-md border p-0.5">
  <a
    {href}
    {target}
    {rel}
    aria-label={ariaLabel}
    class={cn(
      "bg-background border-border flex size-6 items-center justify-center rounded-sm border shadow-md",
      className,
    )}
  >
    {@render children?.()}
  </a>
</div>
