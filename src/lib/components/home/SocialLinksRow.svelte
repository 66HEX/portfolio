<script lang="ts">
  import type { HomeSocialLink } from "$lib/content/homepage-content";
  import Tooltip from "$lib/components/ui/Tooltip.svelte";
  import IconLinkButton from "../ui/IconLinkButton.svelte";

  type Props = {
    name: string;
    role: string;
    links: HomeSocialLink[];
  };

  let { name, role, links }: Props = $props();
</script>

<div class="relative my-4 h-12 w-full">
  <header class="ml-30 flex h-full flex-col items-start justify-start gap-2 sm:ml-38">
    <p class="text-foreground text-lg leading-none font-medium">{name}</p>
    <p class="text-foreground-muted text-xs leading-none">{role}</p>
  </header>

  <div class="absolute top-0 right-0 hidden items-center gap-1 sm:flex">
    {#each links as social (`hero-social-${social.platform}-${social.href}`)}
      {@const Icon = social.icon}
      <Tooltip content={`${social.platform} ${social.handle}`} delay={120}>
        <IconLinkButton href={social.href} ariaLabel={`${social.platform} ${social.handle}`}>
          <Icon size={16} />
        </IconLinkButton>
      </Tooltip>
    {/each}
  </div>
</div>
