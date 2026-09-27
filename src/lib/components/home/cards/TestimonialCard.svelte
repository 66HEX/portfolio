<script lang="ts">
  import * as Avatar from "$lib/components/ui/avatar";
  import * as Card from "$lib/components/ui/card";
  import CardWrapper from "$lib/components/layout/CardWrapper.svelte";
  import IconLinkButton from "$lib/components/layout/IconLinkButton.svelte";
  import IconRenderer from "$lib/components/icons/IconRenderer.svelte";
  import { IconBadgeCheck, IconX } from "$lib/components/icons/data";
  import type { TweetData } from "$lib/features/tweets/types";

  let { tweet, tabindex = 0 }: { tweet: TweetData; tabindex?: 0 | -1 } = $props();
  const item = $derived({
    name: tweet.user.name,
    handle: tweet.user.screen_name,
    text: tweet.text,
    avatar: tweet.user.profile_image_url_https,
    verified: tweet.user.is_blue_verified || tweet.user.verified,
    tweetUrl: `https://x.com/${tweet.user.screen_name}/status/${tweet.id_str}`,
  });
</script>

<CardWrapper class="h-full min-w-0">
  <Card.Root role="article" class="relative h-full w-full min-w-0 gap-0 p-4">
    <div class="flex items-start justify-between gap-2">
      <div class="flex min-w-0 items-center gap-2">
        <Avatar.Root class="size-9">
          <Avatar.Image
            src={item.avatar}
            alt={`${item.name} avatar`}
            loading="eager"
            width="36"
            height="36"
            decoding="async"
          />
          <Avatar.Fallback>{item.name.slice(0, 2)}</Avatar.Fallback>
        </Avatar.Root>
        <div class="flex min-w-0 flex-col gap-0.5">
          <div class="flex items-center gap-1">
            <p class="text-foreground truncate text-base leading-none font-medium tracking-tight">{item.name}</p>
            {#if item.verified}
              <IconRenderer icon={IconBadgeCheck} class="text-primary shrink-0" size={16} label="Verified account" />
            {/if}
          </div>
          <p class="text-muted-foreground text-xs leading-none">@{item.handle}</p>
        </div>
      </div>

      <IconLinkButton
        href={item.tweetUrl}
        variant="ghost"
        target="_blank"
        rel="noopener noreferrer"
        {tabindex}
        ariaLabel={`View testimonial by ${item.name} on X`}
        tooltip="View post on X"
        class="text-muted-foreground -mt-1 -mr-1"
      >
        <IconRenderer icon={IconX} size={16} />
      </IconLinkButton>
    </div>

    <p class="text-muted-foreground mt-3 text-sm">
      {item.text}
    </p>
  </Card.Root>
</CardWrapper>
