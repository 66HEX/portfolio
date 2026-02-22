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

<div class={cn("relative pb-6 pl-6", className)}>
  {#if title}
    <div class="mb-2 flex h-6 items-center">
      <span
        class="bg-background text-foreground absolute -left-3 flex size-6 items-center justify-center rounded-full text-base [counter-increment:step] before:content-[counter(step)]"
      >
        <span class="input-highlight absolute! z-0 size-6 rounded-full"></span>
      </span>
      <h3 class="text-foreground relative z-10 text-base">
        {title}
      </h3>
    </div>
  {:else}
    <span
      class="border-gray-alpha-100 bg-gray-alpha-100 text-foreground absolute top-1 -left-4 flex size-6 items-center justify-center rounded-full border text-base [counter-increment:step] before:content-[counter(step)]"
    ></span>
  {/if}
  <div class="text-gray-alpha-800 text-sm">
    {@render children?.()}
  </div>
</div>
