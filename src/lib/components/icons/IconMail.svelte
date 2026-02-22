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
  viewBox="0 0 18 18"
  class={className}
  {...props}
>
  <path
    d="M1.75,5.75l6.767,3.733c.301,.166,.665,.166,.966,0l6.767-3.733"
    fill="none"
    stroke="currentColor"
    stroke-linecap="round"
    stroke-linejoin="round"
    stroke-width="1.5"
    data-color="color-2"
  ></path>
  <rect
    x="1.75"
    y="3.25"
    width="14.5"
    height="11.5"
    rx="2"
    ry="2"
    transform="translate(18 18) rotate(180)"
    fill="none"
    stroke="currentColor"
    stroke-linecap="round"
    stroke-linejoin="round"
    stroke-width="1.5"
  ></rect>
</svg>
