<script lang="ts">
  import type { HomeSocialLink } from "$lib/content/homepage-content";
  import Tooltip from "$lib/components/ui/Tooltip.svelte";
  import IconLinkButton from "../ui/IconLinkButton.svelte";
  import InsetPanel from "../ui/InsetPanel.svelte";

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

<footer class="w-full">
  <InsetPanel class="relative p-4">
    <div class="relative flex flex-col">
      <div class="flex flex-col gap-2">
        <h3 class="text-foreground text-base leading-none font-medium">
          {headline}
        </h3>
        <p class="text-gray-alpha-800 max-w-xl text-xs leading-none">
          {description}
        </p>
      </div>

      <div class="bg-card my-4 h-px"></div>

      <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div class="flex flex-wrap items-center gap-2">
          {#each socialLinks as social (`footer-social-${social.platform}-${social.href}`)}
            {@const Icon = social.icon}
            <Tooltip content={`${social.platform} ${social.handle}`} delay={120}>
              <IconLinkButton href={social.href} ariaLabel={`${social.platform} ${social.handle}`}>
                <Icon size={16} />
              </IconLinkButton>
            </Tooltip>
          {/each}
        </div>

        <p class="text-gray-alpha-800 mt-2 text-[10px] leading-none font-medium">
          © {year}
          {copyrightName}. {copyrightSuffix}
        </p>
      </div>
    </div>
  </InsetPanel>
</footer>
