<script lang="ts">
  import { cn } from "$lib/utils/cn";

  type ComponentProps = Record<string, unknown> & { class?: string };
  const { class: className = "", ...restProps }: ComponentProps = $props();
</script>

<hr {...restProps} class={cn("bg-background shadow-gray-alpha-100 my-8 h-px border-0 shadow-2xs", className)} />
