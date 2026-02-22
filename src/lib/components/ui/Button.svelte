<script lang="ts">
  import { cva, type VariantProps } from "class-variance-authority";
  import type { Snippet } from "svelte";
  import { cn } from "$lib/utils/cn";

  const buttonVariants = cva("transition-shadow duration-150 ease-out outline-none  leading-none", {
    variants: {
      variant: {
        primary: "btn-primary card-shadow disabled:cursor-not-allowed disabled:opacity-80",
        plain: "cursor-pointer text-left select-none",
        highlight:
          "group bg-gray-alpha-100 text-foreground button-highlight relative cursor-pointer focus-visible:ring-1 focus-visible:ring-blue-500",
      },
      size: {
        form: "inline-flex h-7 items-center justify-center gap-2 rounded-sm px-3 text-sm",
        full: "flex w-full items-center justify-between gap-3",
        icon: "flex size-6 items-center justify-center rounded-sm",
      },
    },
  });

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
