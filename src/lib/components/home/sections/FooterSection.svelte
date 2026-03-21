<script lang="ts">
  import type { HomeSocialLink } from "$lib/content/homepage-content";
  import Tooltip from "$lib/components/ui/Tooltip.svelte";
  import IconLinkButton from "../../layout/IconLinkButton.svelte";
  import SectionBlock from "$lib/components/layout/SectionBlock.svelte";

  const year = new Date().getFullYear();

  type Props = {
    headline: string;
    description: string;
    socialLinks: HomeSocialLink[];
    copyrightName: string;
    copyrightSuffix: string;
  };

  let { headline, description, socialLinks, copyrightName, copyrightSuffix }: Props = $props();
</script>

<SectionBlock>
  <footer class="inset-shadow w-full rounded-lg p-1.5">
    <div class="bg-background card relative flex flex-col rounded-md p-4">
      <div class="flex flex-col gap-1">
        <h3 class="text-foreground text-lg leading-none font-medium">
          {headline}
        </h3>
        <p class="text-foreground-muted max-w-xl text-sm text-balance">
          {description}
        </p>
      </div>

      <div class="bg-card my-4 h-px"></div>

      <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div class="flex flex-wrap items-center gap-1">
          {#each socialLinks as social (`footer-social-${social.platform}-${social.href}`)}
            {@const Icon = social.icon}
            <Tooltip content={`${social.platform} ${social.handle}`} delay={120}>
              <IconLinkButton href={social.href} ariaLabel={`${social.platform} ${social.handle}`}>
                <Icon size={16} />
              </IconLinkButton>
            </Tooltip>
          {/each}
        </div>

        <p class="text-foreground-muted mt-2 text-xs leading-none font-medium">
          © {year}
          {copyrightName}. {copyrightSuffix}
        </p>
      </div>
    </div>
  </footer>
</SectionBlock>
