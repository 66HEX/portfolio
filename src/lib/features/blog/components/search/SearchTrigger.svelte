<script lang="ts">
  import { searchState } from "$lib/stores/search.svelte";
  import { docsUiConfig } from "$lib/config/docs-ui";
  import { cn } from "$lib/utils/cn";
  import Search from "carbon-icons-svelte/lib/Search.svelte";

  let { class: className }: { class?: string } = $props();
</script>

{#if docsUiConfig.search.enabled}
  <button
    type="button"
    class={cn(
      "group inset-shadow bg-background-inset text-foreground-muted/70 hover:text-foreground-muted relative flex h-7.5 w-full items-center gap-2 rounded-sm py-1.5 pr-1 pl-3 text-xs font-medium transition-[color] duration-150 ease-out",
      className,
    )}
    onclick={() => searchState.open()}
  >
    <Search size={16} class="text-foreground-muted/70" />
    <span class="flex-1 text-left">{docsUiConfig.search.triggerPlaceholder}</span>
    {#if docsUiConfig.search.hotkey.enabled}
      <kbd
        class="card bg-background text-foreground-muted/70 pointer-events-none relative hidden h-5 items-center gap-1 rounded-xs px-1.5 font-mono text-[10px] font-medium select-none sm:flex"
      >
        {docsUiConfig.search.hotkey.label}
      </kbd>
    {/if}
  </button>
{/if}
