<script lang="ts">
  import SectionBlock from "../../layout/SectionBlock.svelte";
  import type { AboutListItem, AboutNode } from "$lib/homepage";
  import { resolve } from "$app/paths";
  type Props = {
    content: {
      items: AboutListItem[];
    };
  };

  let { content }: Props = $props();
</script>

{#snippet renderNode(node: AboutNode)}
  {#if node.type === "text"}
    {node.text}
  {:else if node.type === "highlight"}
    <span class="text-foreground font-medium">{node.text}</span>
  {:else if node.type === "link"}
    {#if node.href.startsWith("http") || node.href.startsWith("mailto")}
      <a
        href={node.href}
        target="_blank"
        rel="external noreferrer"
        class="text-foreground focus-visible:ring-ring/50 focus-visible:ring-offset-background rounded-xs font-medium underline decoration-dotted underline-offset-2 transition-[opacity,box-shadow] duration-150 ease-out outline-none hover:opacity-80 focus-visible:ring-3 focus-visible:ring-offset-2 motion-reduce:transition-none"
      >
        {node.text}
      </a>
    {:else}
      <a
        href={resolve(node.href as "/")}
        target="_blank"
        rel="noreferrer"
        class="text-foreground focus-visible:ring-ring/50 focus-visible:ring-offset-background rounded-xs font-medium underline decoration-dotted underline-offset-2 transition-[opacity,box-shadow] duration-150 ease-out outline-none hover:opacity-80 focus-visible:ring-3 focus-visible:ring-offset-2 motion-reduce:transition-none"
      >
        {node.text}
      </a>
    {/if}
  {/if}
{/snippet}

{#snippet renderList(items: AboutListItem[])}
  <ul class="text-muted-foreground list-disc space-y-3 py-1 pl-5 text-sm leading-relaxed tracking-[0.01em] text-pretty">
    {#each items as item, i (i)}
      <li>
        {#each item.content as node, j (j)}
          {@render renderNode(node)}
        {/each}
        {#if item.nestedList}
          <ul class="text-muted-foreground mt-1 list-disc space-y-3 pl-5 text-sm leading-relaxed tracking-[0.01em]">
            {#each item.nestedList as nestedItem, k (k)}
              <li>
                {#each nestedItem.content as node, l (l)}
                  {@render renderNode(node)}
                {/each}
              </li>
            {/each}
          </ul>
        {/if}
      </li>
    {/each}
  </ul>
{/snippet}

<SectionBlock>
  {@render renderList(content.items)}
</SectionBlock>
