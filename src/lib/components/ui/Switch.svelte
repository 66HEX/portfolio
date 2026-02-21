<script lang="ts">
  import { Tween } from "svelte/motion";
  import { cubicOut } from "svelte/easing";
  import { cn } from "$lib/utils/cn";

  type Props = {
    class?: string;
    checked?: boolean;
    disabled?: boolean;
    ariaLabel: string;
    onCheckedChange?: (checked: boolean) => void;
    [prop: string]: unknown;
  };

  let {
    class: className = "",
    checked = $bindable(false),
    disabled = false,
    ariaLabel,
    onCheckedChange,
    ...restProps
  }: Props = $props();

  const thumbX = new Tween(0, {
    duration: 150,
    easing: cubicOut,
  });

  $effect(() => {
    thumbX.set(checked ? 20 : 0);
  });

  const handleClick = (): void => {
    if (disabled) return;
    checked = !checked;
    onCheckedChange?.(checked);
  };
</script>

<button
  type="button"
  role="switch"
  aria-label={ariaLabel}
  aria-checked={checked}
  {disabled}
  {...restProps}
  class={cn(
    "relative flex h-5 w-10 shrink-0 rounded-sm outline-none focus-visible:ring-1 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-70",
    className,
  )}
  onclick={handleClick}
>
  <span
    aria-hidden="true"
    style="transform: translateX({thumbX.current}px)"
    class={cn("btn-secondary card-shadow pointer-events-none absolute top-0 left-0 block size-5 rounded-full")}
  ></span>
</button>
