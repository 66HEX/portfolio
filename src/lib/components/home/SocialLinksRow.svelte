<script lang="ts">
  import { onMount } from "svelte";
  import type { HomeSocialLink } from "$lib/content/homepage-content";
  import { seoConfig } from "$lib/seo/meta";
  import Tooltip from "$lib/components/ui/Tooltip.svelte";
  import Switch from "../ui/Switch.svelte";
  import IconLinkButton from "../ui/IconLinkButton.svelte";

  type Props = {
    name: string;
    role: string;
    links: HomeSocialLink[];
  };

  type ThemePreference = "light" | "dark";

  const THEME_STORAGE_KEY = "theme-preference";
  const DARK_CLASS = "dark";
  const THEME_CHANGE_EVENT = "themechange";

  let { name, role, links }: Props = $props();
  let theme = $state<ThemePreference>("light");

  const isDarkTheme = $derived(theme === "dark");

  const applyTheme = (nextTheme: ThemePreference, persist = true): void => {
    theme = nextTheme;

    if (typeof document !== "undefined") {
      const applyThemeToDom = () => {
        document.documentElement.classList.toggle(DARK_CLASS, nextTheme === "dark");
        const themeColorMeta = document.querySelector('meta[name="theme-color"]');
        if (themeColorMeta) {
          themeColorMeta.setAttribute(
            "content",
            nextTheme === "dark" ? seoConfig.themeColorDark : seoConfig.themeColorLight,
          );
        }

        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent(THEME_CHANGE_EVENT, {
              detail: { theme: nextTheme },
            }),
          );
        }
      };

      applyThemeToDom();
    }

    if (persist && typeof window !== "undefined") {
      try {
        window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
      } catch {
        // Ignore storage errors (e.g. private mode / disabled storage).
      }
    }
  };

  const handleThemeCheckedChange = (checked: boolean): void => {
    applyTheme(checked ? "dark" : "light");
  };

  onMount(() => {
    theme = document.documentElement.classList.contains(DARK_CLASS) ? "dark" : "light";

    const themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (themeColorMeta) {
      themeColorMeta.setAttribute("content", theme === "dark" ? seoConfig.themeColorDark : seoConfig.themeColorLight);
    }
  });
</script>

<div class="relative my-4 h-12 w-full">
  <header class="ml-30 flex h-full flex-col items-start justify-start gap-2 sm:ml-38">
    <p class="text-foreground text-lg leading-none font-medium">{name}</p>
    <p class="text-gray-alpha-800 text-xs leading-none">{role}</p>
  </header>
  <div
    class="bg-background input-highlight absolute! top-0.5 right-0 flex items-center gap-1 rounded-full p-1 sm:right-40"
  >
    <Switch
      ariaLabel="Toggle color theme"
      checked={isDarkTheme}
      onCheckedChange={handleThemeCheckedChange}
      class="focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-500"
    />
  </div>

  <div class="bg-background input-highlight absolute! top-0 right-0 hidden items-center gap-1 rounded-md p-1 sm:flex">
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
