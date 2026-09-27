<script lang="ts">
  import type { HomepageContent } from "$lib/homepage";
  import * as Card from "$lib/components/ui/card";
  import IconLinkButton from "../../layout/IconLinkButton.svelte";
  import SectionBlock from "$lib/components/layout/SectionBlock.svelte";
  import IconRenderer from "$lib/components/icons/IconRenderer.svelte";
  import CardWrapper from "$lib/components/layout/CardWrapper.svelte";

  const year = new Date().getFullYear();

  let { content }: { content: HomepageContent["footer"] } = $props();
</script>

<SectionBlock>
  <CardWrapper>
    <footer>
      <Card.Root>
        <Card.Header>
          <h2 class="text-foreground font-display text-lg leading-none font-medium tracking-tight">
            {content.headline}
          </h2>
          <p class="text-muted-foreground max-w-xl text-sm text-balance">
            {content.description}
          </p>
        </Card.Header>

        <Card.Footer class="mt-4 flex-col items-start gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div class="flex flex-wrap items-center gap-1">
            {#each content.socialLinks as social (`footer-social-${social.platform}-${social.href}`)}
              <IconLinkButton href={social.href} ariaLabel={`${social.platform} ${social.handle}`}>
                <IconRenderer icon={social.icon} size={16} />
              </IconLinkButton>
            {/each}
          </div>

          <p class="text-muted-foreground mt-2 text-xs leading-none font-medium">
            © {year}
            {content.copyrightName}. {content.copyrightSuffix}
          </p>
        </Card.Footer>
      </Card.Root>
    </footer>
  </CardWrapper>
</SectionBlock>
