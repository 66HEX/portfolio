<script lang="ts">
  import type { HomeSocialLink } from "$lib/content/homepage-content";
  import Tooltip from "$lib/components/ui/Tooltip.svelte";
  import IconLinkButton from "../../layout/IconLinkButton.svelte";

  type Props = {
    name: string;
    role: string;
    links: HomeSocialLink[];
  };

  let { name, role, links }: Props = $props();
</script>

<div class="relative mb-8 w-full">
  <header class="ml-42 flex h-full flex-col items-start justify-start gap-1">
    <p class="text-foreground text-lg leading-none font-medium">{name}</p>
    <p class="text-foreground-muted text-xs leading-none">{role}</p>
  </header>

  <div class="absolute -top-15 right-8 flex items-center gap-1 sm:top-0 sm:right-4">
    {#each links as social (`hero-social-${social.platform}-${social.href}`)}
      {@const Icon = social.icon}
      <Tooltip content={`${social.platform} ${social.handle}`}>
        <IconLinkButton href={social.href} ariaLabel={`${social.platform} ${social.handle}`}>
          <Icon size={16} />
        </IconLinkButton>
      </Tooltip>
    {/each}
  </div>
</div>
