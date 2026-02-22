<script lang="ts">
  import type { Snippet } from "svelte";
  import { cn } from "$lib/utils/cn";

  type ComponentProps = {
    class?: string;
    children?: Snippet;
    [prop: string]: unknown;
  };

  const { children, class: className = "", ...restProps }: ComponentProps = $props();
</script>

<div class="input-highlight bg-background relative my-6 rounded-md">
  <div class="custom-scrollbar w-full overflow-x-auto rounded-md">
    <table {...restProps} class={cn("w-full text-sm [&_code]:text-sm", className)}>
      {@render children?.()}
    </table>
  </div>
</div>
