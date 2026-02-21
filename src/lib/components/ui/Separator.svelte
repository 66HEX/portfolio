<script lang="ts">
  import { cn } from "$lib/utils/cn";

  let { class: className = "" } = $props();
</script>

<div class={cn("bg-background shadow-card mt-1 h-px shadow-2xs", className)}></div>
