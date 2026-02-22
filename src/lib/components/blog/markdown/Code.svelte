<script lang="ts">
  import type { Snippet } from "svelte";
  import { cn } from "$lib/utils/cn";

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
  <code {...restProps} class={cn("block font-mono text-sm whitespace-pre", className)}>
    {@render children?.()}
  </code>
{:else}
  <div
    class="input-highlight bg-background text-foreground inline-block w-fit rounded-sm px-1.5 py-1 text-xs leading-none font-medium whitespace-nowrap"
  >
    <code {...restProps} class={cn("", className)}>
      {@render children?.()}
    </code>
  </div>
{/if}
