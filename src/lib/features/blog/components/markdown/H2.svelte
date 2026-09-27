<script lang="ts">
  import type { ComponentProps } from "svelte";
  import Heading from "./Heading.svelte";
  let props: Omit<ComponentProps<typeof Heading>, "level"> = $props();
</script>

<Heading {...props} level={2} />
