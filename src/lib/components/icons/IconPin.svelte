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
  <circle
    cx="9"
    cy="5"
    r="3.25"
    fill="none"
    stroke="currentColor"
    stroke-linecap="round"
    stroke-linejoin="round"
    stroke-width="1.5"
  ></circle>
  <line
    x1="9"
    y1="13.25"
    x2="9"
    y2="8.25"
    fill="none"
    stroke="currentColor"
    stroke-linecap="round"
    stroke-linejoin="round"
    stroke-width="1.5"
  ></line>
  <path
    d="M12,12.429c2.507,.315,4.25,1.012,4.25,1.821,0,1.105-3.246,2-7.25,2s-7.25-.895-7.25-2c0-.809,1.743-1.507,4.25-1.821"
    fill="none"
    stroke="currentColor"
    stroke-linecap="round"
    stroke-linejoin="round"
    stroke-width="1.5"
    data-color="color-2"
  ></path>
</svg>
