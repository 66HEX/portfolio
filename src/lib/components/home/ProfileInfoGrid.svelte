<script lang="ts">
  import type { ProfileInfoItem } from "$lib/content/homepage-content";
  import { onMount } from "svelte";
  import IconBadge from "../ui/IconBadge.svelte";

  type Props = {
    content: {
      timeZone: string;
      timeFallbackText: string;
      left: ProfileInfoItem[];
      right: ProfileInfoItem[];
    };
  };

  let { content }: Props = $props();
  let warsawTimeText = $state("");

  onMount(() => {
    const formatter = new Intl.DateTimeFormat("en-GB", {
      timeZone: content.timeZone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    const updateClock = () => {
      warsawTimeText = formatter.format(new Date());
    };

    updateClock();

    const intervalId = window.setInterval(updateClock, 60000);

    return () => {
      window.clearInterval(intervalId);
    };
  });

  const profileInfo = $derived({
    right: content.right,
    left: content.left.map((item) =>
      item.kind === "time" ? { ...item, text: warsawTimeText || content.timeFallbackText } : item,
    ),
  });
</script>

<div class="grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
  {#each [profileInfo.left, profileInfo.right] as column, columnIndex (`profile-col-${columnIndex}`)}
    <div class="bg-background input-highlight col-span-1 flex flex-col items-start gap-2 rounded-md p-3">
      {#each column as item, itemIndex (`profile-item-${columnIndex}-${itemIndex}-${item.text}`)}
        {@const Icon = item.icon}
        <div class="flex w-full items-center justify-start gap-2">
          <IconBadge>
            <Icon size={14} class="text-foreground" strokeWidth={2.25} />
          </IconBadge>
          <p class="text-foreground text-xs font-medium">
            {item.text}
          </p>
        </div>
      {/each}
    </div>
  {/each}
</div>
