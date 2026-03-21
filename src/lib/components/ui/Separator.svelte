<script lang="ts">
  import { cn } from "$lib/utils/cn";
  let { class: className = "" } = $props();
</script>

<div data-separator class={cn(className)}></div>

<style>
  [data-separator] {
    position: relative;
    height: 0;
    overflow: visible;
  }

  [data-separator]::before {
    content: "";
    position: absolute;
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 120%;
    border-top: 1px dashed var(--color-border);
  }
</style>
