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
  <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
  <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
</svg>
