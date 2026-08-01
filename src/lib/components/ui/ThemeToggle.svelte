<script lang="ts">
  import { cn } from "$lib/utils/cn";
  import { themeStore } from "$lib/stores/theme.svelte";
  import Tooltip from "$lib/components/ui/Tooltip.svelte";
  import IconRenderer from "$lib/content/IconRenderer.svelte";
  import { IconMoon, IconSun } from "$lib/content/icons";

  type Props = {
    class?: string;
  };

  let { class: className = "" }: Props = $props();
  const isDark = $derived(themeStore.isDark);
  const ariaLabel = $derived(isDark ? "Switch to light mode" : "Switch to dark mode");
</script>

<Tooltip content={ariaLabel}>
  <div class="bg-background-inset card-outer rounded-sm p-1">
    <button
      type="button"
      class={cn(
        "group transition-scale text-foreground bg-background card flex size-6 items-center justify-center rounded-[calc(var(--radius-base)*1.25)] duration-150 ease-out active:scale-[0.95]",
        className,
      )}
      onclick={themeStore.toggle}
      aria-label={ariaLabel}
      aria-pressed={isDark}
    >
      <span class="sr-only">{ariaLabel}</span>
      <span
        class={cn(
          "absolute transition-[opacity,filter,scale] duration-150 ease-out will-change-[opacity,filter,scale]",
          !themeStore.isDark ? "blur-0 scale-100 opacity-100" : " scale-[0.25] opacity-0 blur-xs",
        )}
      >
        <IconRenderer icon={IconSun} size={16} />
      </span>
      <span
        class={cn(
          "absolute transition-[opacity,filter,scale] duration-150 ease-out will-change-[opacity,filter,scale]",
          !themeStore.isDark ? "scale-[0.25] opacity-0 blur-xs" : "blur-0 scale-100 opacity-100",
        )}
      >
        <IconRenderer icon={IconMoon} size={16} />
      </span>
    </button>
  </div>
</Tooltip>
