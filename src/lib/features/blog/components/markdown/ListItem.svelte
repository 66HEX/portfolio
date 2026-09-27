<script lang="ts">
  import type { Snippet } from "svelte";
  import { Checkbox } from "$lib/components/ui/checkbox";
  import { cn } from "$lib/utils";

  type ComponentProps = {
    class?: string;
    children?: Snippet;
    "data-task-checked"?: string;
    [prop: string]: unknown;
  };

  const { children, class: className = "", "data-task-checked": taskChecked, ...restProps }: ComponentProps = $props();
  const id = $props.id();
  const contentId = `${id}-content`;
</script>

<li
  {...restProps}
  class={cn(
    "text-muted-foreground text-sm font-normal tracking-normal text-pretty",
    taskChecked !== undefined && "list-none",
    className,
  )}
>
  {#if taskChecked !== undefined}
    <div class="grid grid-cols-[1rem_minmax(0,1fr)] items-start gap-x-2">
      <Checkbox
        checked={taskChecked === "true"}
        disabled
        aria-labelledby={contentId}
        class="bg-card mt-[calc((1lh-1rem)/2)] disabled:cursor-default disabled:opacity-100"
      />
      <div id={contentId} class="min-w-0 [&>:first-child]:mt-0">
        {@render children?.()}
      </div>
    </div>
  {:else}
    {@render children?.()}
  {/if}
</li>
