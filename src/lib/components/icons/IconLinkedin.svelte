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
    d="M6.94 7.5a1.62 1.62 0 1 1 0-3.24 1.62 1.62 0 0 1 0 3.24ZM5.56 19.5h2.77V9.19H5.56V19.5Zm4.56 0h2.76v-5.4c0-1.43.27-2.81 2.04-2.81 1.74 0 1.76 1.62 1.76 2.9v5.31h2.77v-5.88c0-2.9-.62-5.13-4-5.13-1.62 0-2.7.9-3.14 1.74h-.04v-1.48h-2.65V19.5Z"
  />
</svg>
