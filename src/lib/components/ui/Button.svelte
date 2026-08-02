<script lang="ts">
  import { cva, type VariantProps } from "class-variance-authority";
  import type { Snippet } from "svelte";
  import { cn } from "$lib/utils/cn";

  const buttonVariants = cva(
    "leading-none transition-shadow duration-150 ease-out outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none",
    {
      variants: {
        variant: {
          primary: "btn-primary card-shadow disabled:cursor-not-allowed disabled:opacity-80",
        },
        size: {
          form: "inline-flex h-8 items-center justify-center gap-2 rounded-sm px-3 text-sm",
        },
      },
    },
  );

  type ButtonVariant = NonNullable<VariantProps<typeof buttonVariants>["variant"]>;
  type ButtonSize = NonNullable<VariantProps<typeof buttonVariants>["size"]>;

  type Props = {
    class?: string;
    children?: Snippet;
    variant: ButtonVariant;
    size: ButtonSize;
    [prop: string]: unknown;
  };

  const { class: className = "", children, variant, size, ...restProps }: Props = $props();
</script>

<button {...restProps} class={cn(buttonVariants({ variant, size }), className)}>
  {@render children?.()}
</button>
