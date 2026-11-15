<script lang="ts">
  import type { Snippet } from "svelte";
  import { cn } from "$lib/utils";

  type ComponentProps = {
    class?: string;
    children?: Snippet;
    [prop: string]: unknown;
  };

  const { children, class: className = "", ...restProps }: ComponentProps = $props();
</script>

<ol
  {...restProps}
  class={cn(
    "text-muted-foreground mt-6 list-decimal space-y-2 pl-6 text-sm font-normal tracking-normal text-pretty [&_ol]:mt-2 [&_ul]:mt-2 [&.contains-task-list]:pl-0 [&.contains-task-list>li:not(.task-list-item)]:ml-6 [&>li:not(.task-list-item)]:pl-1",
    className,
  )}
>
  {@render children?.()}
</ol>
