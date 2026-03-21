<script lang="ts">
  import SectionBlock from "../../layout/SectionBlock.svelte";
  import type { AboutListItem, AboutNode } from "$lib/content/homepage-content";
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
        class="text-foreground underline decoration-dotted underline-offset-2 transition-opacity hover:opacity-80"
      >
        {node.text}
      </a>
    {:else}
      <a
        href={resolve(node.href as "/")}
        target="_blank"
        rel="noreferrer"
        class="text-foreground underline decoration-dotted underline-offset-2 transition-opacity hover:opacity-80"
      >
        {node.text}
      </a>
    {/if}
  {/if}
{/snippet}

{#snippet renderList(items: AboutListItem[])}
  <ul class="text-foreground-muted list-disc space-y-3 py-1 pl-5 text-sm text-pretty">
    {#each items as item, i (i)}
      <li>
        {#each item.content as node, j (j)}
          {@render renderNode(node)}
        {/each}
        {#if item.nestedList}
          <ul class="text-foreground-muted mt-1 list-disc space-y-3 pl-5 text-sm">
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
