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
    d="M12 2a10 10 0 0 0-3.16 19.49c.5.1.68-.22.68-.48v-1.7c-2.78.61-3.37-1.2-3.37-1.2-.45-1.16-1.1-1.46-1.1-1.46-.9-.62.06-.6.06-.6 1 .07 1.53 1.03 1.53 1.03.88 1.5 2.32 1.07 2.89.82.09-.65.35-1.08.63-1.33-2.22-.25-4.56-1.11-4.56-4.96 0-1.1.4-2 1.03-2.7-.1-.25-.45-1.28.1-2.66 0 0 .84-.27 2.75 1.03A9.53 9.53 0 0 1 12 6.8c.85 0 1.72.11 2.52.33 1.91-1.3 2.75-1.03 2.75-1.03.55 1.38.2 2.4.1 2.66.64.7 1.03 1.6 1.03 2.7 0 3.86-2.34 4.7-4.58 4.95.36.31.67.92.67 1.86v2.76c0 .26.18.58.69.48A10 10 0 0 0 12 2Z"
  />
</svg>
