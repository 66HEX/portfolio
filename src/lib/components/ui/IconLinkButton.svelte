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

<a
  {href}
  {target}
  {rel}
  aria-label={ariaLabel}
  class={cn("card-shadow btn-secondary card-shadow flex size-6 items-center justify-center rounded-sm", className)}
>
  {@render children?.()}
</a>
