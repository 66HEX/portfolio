<script lang="ts">
  import type { HTMLAttributes } from "svelte/elements";
  import type { Snippet } from "svelte";
  import HeadingAnchor from "../HeadingAnchor.svelte";
  import { cn } from "$lib/utils";

  let {
    level,
    children,
    id,
    class: className,
    ...rest
  }: HTMLAttributes<HTMLHeadingElement> & {
    level: 1 | 2 | 3 | 4 | 5 | 6;
    children?: Snippet;
  } = $props();

  const sizes = {
    1: "text-xl [&_a]:text-xl [&_code]:text-lg",
    2: "text-lg [&_a]:text-lg [&_code]:text-base",
    3: "text-base [&_a]:text-base [&_code]:text-sm",
    4: "text-base [&_a]:text-base [&_code]:text-sm",
    5: "text-sm [&_a]:text-sm [&_code]:text-sm",
    6: "text-sm [&_a]:text-sm [&_code]:text-sm",
  };
</script>

<div
  data-heading
  class={cn("group/heading flex items-center gap-1", level === 1 ? "mt-10" : level === 2 ? "mt-8" : "mt-6")}
>
  <svelte:element
    this={`h${level}`}
    {id}
    {...rest}
    class={cn(
      "min-w-0 scroll-m-24 leading-tight font-medium tracking-tight",
      level === 6 ? "text-muted-foreground" : "text-foreground",
      sizes[level],
      className,
    )}
  >
    {@render children?.()}
  </svelte:element>
  {#if id}<HeadingAnchor {id} />{/if}
</div>
