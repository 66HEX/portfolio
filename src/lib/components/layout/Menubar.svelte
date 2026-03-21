<script lang="ts">
  import ThemeToggle from "$lib/components/ui/ThemeToggle.svelte";
  import SearchTrigger from "$lib/features/blog/components/search/SearchTrigger.svelte";
</script>

<div class="border-border relative flex items-center justify-end gap-3 border-b border-dashed px-4 py-1.5">
  <div class="flex items-center gap-2">
    <SearchTrigger class="w-44" />
    <ThemeToggle />
  </div>
</div>
