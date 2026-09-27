<script lang="ts">
  import { Separator } from "$lib/components/ui/separator";
  import { cn } from "$lib/utils";
  import type { ComponentProps } from "svelte";

  let { class: className, ...restProps }: ComponentProps<typeof Separator> = $props();
</script>

<Separator {...restProps} class={cn("my-12", className)} />
