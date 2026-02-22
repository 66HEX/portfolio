<script lang="ts">
  import { cva, type VariantProps } from "class-variance-authority";
  import { cn } from "$lib/utils/cn";

  const inputVariants = cva("", {
    variants: {
      variant: {
        field:
          "text-foreground placeholder:text-gray-alpha-800 leading-none absolute inset-0 rounded-sm transition-shadow duration-150 ease-out outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
        hidden: "pointer-events-none absolute h-0 w-0 opacity-0",
      },
      size: {
        field: "px-2 py-1.5 text-sm",
      },
    },
  });

  type InputVariant = NonNullable<VariantProps<typeof inputVariants>["variant"]>;
  type InputSize = NonNullable<VariantProps<typeof inputVariants>["size"]>;

  type Props = {
    class?: string;
    variant: InputVariant;
    size?: InputSize;
    value?: string;
    [prop: string]: unknown;
  };

  let { class: className = "", variant, size, value = $bindable(""), ...restProps }: Props = $props();
</script>

<input {...restProps} bind:value class={cn(inputVariants({ variant, size }), className)} />
