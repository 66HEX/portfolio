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
  <path d="m12 19-7-7 7-7" />
  <path d="M19 12H5" />
</svg>
