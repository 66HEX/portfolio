<script lang="ts">
  import ChevronDown from "lucide-svelte/icons/chevron-down";
  import { cubicInOut } from "svelte/easing";
  import { slide } from "svelte/transition";
  import type { TransitionConfig } from "svelte/transition";
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

  let openIndex = $state<number | null>(null);

  function toggleItem(index: number) {
    openIndex = openIndex === index ? null : index;
  }

  function rotate(_node: Element, params: { from: number; to: number; duration?: number }): TransitionConfig {
    const { from, to, duration = 180 } = params;
    return {
      duration,
      easing: cubicInOut,
      css: (t) => `transform: rotate(${from + (to - from) * t}deg);`,
    };
  }
</script>

<SectionBlock {title}>
  <div class="flex flex-col gap-2">
    {#each items as item, index (`faq-${index}-${item.question}`)}
      {@const isOpen = openIndex === index}
      <ContentCard
        class="cursor-pointer has-focus-visible:outline-2 has-focus-visible:outline-offset-1 has-focus-visible:outline-blue-500"
        onclick={() => toggleItem(index)}
      >
        <Button type="button" variant="plain" size="full" aria-expanded={isOpen} aria-controls={`faq-answer-${index}`}>
          <span class="text-foreground text-xs leading-none font-medium">
            {item.question}
          </span>
          {#key `${index}-${isOpen ? "open" : "closed"}`}
            <span
              class="text-gray-alpha-800 shrink-0"
              style={`transform: rotate(${isOpen ? 180 : 0}deg);`}
              in:rotate={{
                from: isOpen ? 0 : 180,
                to: isOpen ? 180 : 0,
              }}
            >
              <ChevronDown size={14} strokeWidth={2.25} />
            </span>
          {/key}
        </Button>

        {#if isOpen}
          <div
            id={`faq-answer-${index}`}
            class="overflow-hidden"
            transition:slide={{
              duration: 220,
              easing: cubicInOut,
            }}
          >
            <div class="pb-1">
              <Separator class="my-3" />

              <p class="text-gray-alpha-800 mr-3 text-xs leading-relaxed">
                {item.answer}
              </p>
            </div>
          </div>
        {/if}
      </ContentCard>
    {/each}
  </div>
</SectionBlock>
