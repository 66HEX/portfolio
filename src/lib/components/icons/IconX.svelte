<script lang="ts">
  import type { SVGAttributes } from "svelte/elements";

  let {
    size = 24,
    class: className,
    ...props
  }: {
    size?: number | string;
    class?: string;
  } & SVGAttributes<SVGElement> = $props();
</script>

<svg
  xmlns="http://www.w3.org/2000/svg"
  width={size}
  height={size}
  fill="currentColor"
  viewBox="0 0 24 24"
  class={className}
  {...props}
>
  <path
    d="m18.9 2.25-5.13 5.87L9.66 2.25H2.5l7.84 11.14L2.95 21.75h2.4l6.06-6.94 4.86 6.94h7.23l-8.06-11.5 6.97-8h-2.5Z"
  />
</svg>
