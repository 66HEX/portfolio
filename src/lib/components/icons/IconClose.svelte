<script lang="ts">
  import type { SVGAttributes } from "svelte/elements";

  let {
    size = 24,
    strokeWidth = 2,
    class: className,
    ...props
  }: {
    size?: number | string;
    strokeWidth?: number | string;
    class?: string;
  } & SVGAttributes<SVGElement> = $props();
</script>

<svg
  xmlns="http://www.w3.org/2000/svg"
  width={size}
  height={size}
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width={strokeWidth}
  stroke-linecap="round"
  stroke-linejoin="round"
  class={className}
  {...props}
>
  <path d="M18 6 6 18" />
  <path d="m6 6 12 12" />
</svg>
