<script lang="ts">
  import { Badge } from "$lib/components/ui/badge";
  import type { Snippet } from "svelte";
  import { cn } from "$lib/utils";

  type ComponentProps = {
    class?: string;
    children?: Snippet;
    [prop: string]: unknown;
  };

  const { children, class: className = "", ...restProps }: ComponentProps = $props();

  const isBlock = (classValue: string | undefined, dataTheme: unknown) => {
    if (dataTheme !== undefined) return true;
    if (!classValue) return false;

    return classValue.split(/\s+/).some((token) => token.startsWith("language-"));
  };
</script>

{#if isBlock(typeof className === "string" ? className : undefined, restProps["data-theme"])}
  <code {...restProps} class={cn("block font-mono text-sm leading-relaxed whitespace-pre", className)}>
    {@render children?.()}
  </code>
{:else}
  <Badge variant="secondary" class="rounded-sm px-1.5 font-mono text-xs">
    <code {...restProps} class={cn("font-mono", className)}>{@render children?.()}</code>
  </Badge>
{/if}
