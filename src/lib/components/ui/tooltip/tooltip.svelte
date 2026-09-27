<script lang="ts" module>
  import { MediaQuery } from "svelte/reactivity";

  const supportsHover = new MediaQuery("(hover: hover) and (pointer: fine)", false);
</script>

<script lang="ts" generics="T = never">
  import { Tooltip as TooltipPrimitive } from "bits-ui";

  let { open = $bindable(false), ...restProps }: TooltipPrimitive.RootProps<T> = $props();
</script>

<!-- Gate the tooltip without changing the trigger's actions or tab order. -->
<TooltipPrimitive.Root
  bind:open={() => supportsHover.current && open, (nextOpen) => (open = supportsHover.current && nextOpen)}
  {...restProps}
/>
