<script lang="ts">
  import IconChevronDown from "$lib/components/icons/IconChevronDown.svelte";
  import { slide } from "svelte/transition";
  import type { FaqItem } from "$lib/content/homepage-content";
  import Button from "../ui/Button.svelte";
  import Separator from "../ui/Separator.svelte";
  import ContentCard from "../ui/ContentCard.svelte";
  import SectionBlock from "../ui/SectionBlock.svelte";

  type Props = {
    title: string;
    items: FaqItem[];
  };

  let { title, items }: Props = $props();

  let openItems = $state<Record<string, boolean>>({});

  function isOpen(question: string): boolean {
    return openItems[question] ?? false;
  }

  function toggleItem(question: string) {
    openItems[question] = !isOpen(question);
  }
</script>

<SectionBlock {title}>
  <div class="flex flex-col gap-2">
    {#each items as item, index (`faq-${index}-${item.question}`)}
      {@const itemIsOpen = isOpen(item.question)}
      <ContentCard
        class="has-focus-visible:outline-accent has-focus-visible:outline-2 has-focus-visible:outline-offset-1"
      >
        <Button
          type="button"
          variant="plain"
          size="full"
          aria-expanded={itemIsOpen}
          aria-controls={`faq-answer-${index}`}
          onclick={() => toggleItem(item.question)}
        >
          <span class="text-foreground text-sm leading-none font-medium">
            {item.question}
          </span>
          <span class="text-foreground-muted shrink-0 transition-transform duration-150" class:rotate-180={itemIsOpen}>
            <IconChevronDown size={14} />
          </span>
        </Button>

        {#if itemIsOpen}
          <div
            id={`faq-answer-${index}`}
            class="overflow-hidden"
            transition:slide={{
              duration: 220,
            }}
          >
            <div class="pb-1">
              <Separator class="my-3" />

              <p class="text-foreground-muted mr-3 text-sm leading-relaxed">
                {item.answer}
              </p>
            </div>
          </div>
        {/if}
      </ContentCard>
    {/each}
  </div>
</SectionBlock>
