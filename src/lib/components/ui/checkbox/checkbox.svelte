<script lang="ts">
  import { Checkbox as CheckboxPrimitive } from "bits-ui";
  import IconRenderer from "$lib/components/icons/IconRenderer.svelte";
  import { IconCheck, IconMinus } from "$lib/components/icons/data";
  import { cn, type WithoutChildrenOrChild } from "$lib/utils.js";

  let {
    ref = $bindable(null),
    checked = $bindable(false),
    indeterminate = $bindable(false),
    class: className,
    ...restProps
  }: WithoutChildrenOrChild<CheckboxPrimitive.RootProps> = $props();
</script>

<CheckboxPrimitive.Root
  bind:ref
  data-slot="checkbox"
  class={cn(
    "hit-area border-input dark:bg-input/30 data-checked:bg-primary data-checked:text-primary-foreground dark:data-checked:bg-primary data-checked:border-primary aria-invalid:aria-checked:border-primary aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 group-has-[:focus-visible]/field-label:not-data-checked:border-input group-has-[:focus-visible]/field-label:data-checked:border-primary peer relative flex size-4 shrink-0 touch-manipulation items-center justify-center rounded-[4px] border transition-shadow outline-none group-has-disabled/field:opacity-50 group-has-[:focus-visible]/field-label:ring-0 focus-visible:ring-3 disabled:cursor-not-allowed disabled:opacity-50 disabled:after:content-none aria-invalid:ring-3",
    className,
  )}
  bind:checked
  bind:indeterminate
  {...restProps}
>
  {#snippet children({ checked, indeterminate })}
    <div data-slot="checkbox-indicator" class="grid place-content-center text-current transition-none [&>svg]:size-3.5">
      {#if checked}
        <IconRenderer icon={IconCheck} size={14} />
      {:else if indeterminate}
        <IconRenderer icon={IconMinus} size={14} />
      {/if}
    </div>
  {/snippet}
</CheckboxPrimitive.Root>
