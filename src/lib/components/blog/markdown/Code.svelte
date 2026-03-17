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
  <code {...restProps} class={cn("block font-mono text-sm leading-relaxed whitespace-pre", className)}>
    {@render children?.()}
  </code>
{:else}
  <div
    class="inset-shadow border-border bg-background-inset text-foreground relative inline-block w-fit rounded-sm border px-px py-0.5 font-mono text-sm font-medium whitespace-nowrap"
  >
    <code
      {...restProps}
      class={cn(
        "border-border bg-background rounded-[calc(var(--radius-base)*1.5)] border px-1.5 py-0.5 shadow-md",
        className,
      )}
    >
      {@render children?.()}
    </code>
  </div>
{/if}
