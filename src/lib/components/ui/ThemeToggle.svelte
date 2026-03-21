<script lang="ts">
  import { cn } from "$lib/utils/cn";
  import { themeStore } from "$lib/stores/theme.svelte";
  import Sun from "carbon-icons-svelte/lib/Sun.svelte";
  import Moon from "carbon-icons-svelte/lib/Moon.svelte";

  type Props = {
    class?: string;
  };

  let { class: className = "" }: Props = $props();
  const isDark = $derived(themeStore.isDark);
  const ariaLabel = $derived(isDark ? "Switch to light mode" : "Switch to dark mode");
</script>

<div class="bg-background-inset inset-shadow rounded-sm p-1">
  <button
    type="button"
    class={cn(
      "group transition-scale text-foreground bg-background card flex size-6 items-center justify-center rounded-[calc(var(--radius-base)*1.25)] duration-150 ease-out active:scale-[0.95]",
      className,
    )}
    onclick={themeStore.toggle}
    aria-label={ariaLabel}
    aria-pressed={isDark}
    title={ariaLabel}
  >
    <span class="sr-only">{ariaLabel}</span>
    <span class={cn("transition-transform duration-150 ease-out", isDark && "scale-0 blur-[2px]")}>
      <Sun size={16} />
    </span>
    <span class={cn("absolute transition-transform duration-150 ease-out", !isDark && "scale-0 blur-[2px]")}>
      <Moon size={16} />
    </span>
  </button>
</div>
