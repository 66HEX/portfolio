<script lang="ts">
  import { cn } from "$lib/utils/cn";
  import type { Snippet } from "svelte";

  let {
    class: className,
    children,
    title,
  } = $props<{
    class?: string;
    children?: Snippet;
    title?: string;
  }>();
</script>

<div class={cn("relative pl-8", className)}>
  {#if title}
    <div class="mb-4 flex h-10 items-center">
      <div class="inset-shadow bg-background-inset absolute -left-5 flex size-10 rounded-full p-1">
        <span
          class="card bg-background text-foreground flex h-full w-full items-center justify-center rounded-full text-xs font-medium [counter-increment:step] before:content-[counter(step)]"
        >
        </span>
      </div>
      <h3 class="relative z-10 text-base leading-none font-medium tracking-tight">
        {title}
      </h3>
    </div>
  {:else}
    <div class="inset-shadow bg-background-inset absolute -left-5 flex size-10 rounded-full p-1">
      <span
        class="card bg-background text-foreground flex h-full w-full items-center justify-center rounded-full text-xs font-medium [counter-increment:step] before:content-[counter(step)]"
      >
      </span>
    </div>
  {/if}
  <div class={cn("text-foreground-muted text-sm tracking-normal", !title && "pt-2")}>
    {@render children?.()}
  </div>
</div>
