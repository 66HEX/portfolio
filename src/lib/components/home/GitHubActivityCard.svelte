<script lang="ts" module>
  type GitHubContributionCache = {
    date: string;
    count: number;
  };

  let cachedClientContributions: GitHubContributionCache[] | undefined;

  function getCachedClientContributions(): GitHubContributionCache[] | undefined {
    return cachedClientContributions;
  }

  function setCachedClientContributions(value: GitHubContributionCache[]): void {
    cachedClientContributions = value;
  }
</script>

<script lang="ts">
  import type { HomepageContent } from "$lib/content/homepage-content";
  import { onMount } from "svelte";
  import GitHubContributionGraph from "$lib/components/github/GitHubContributionGraph.svelte";
  import InsetPanel from "../ui/InsetPanel.svelte";

  type GitHubContribution = {
    date: string;
    count: number;
  };

  type Props = {
    username: string;
    contributions?: GitHubContribution[];
    apiConfigured: boolean;
    missingTokenMessage: string;
    graphText: HomepageContent["githubCard"]["graphText"];
  };

  let { username, contributions = undefined, apiConfigured, missingTokenMessage, graphText }: Props = $props();

  let clientContributions = $state<GitHubContribution[] | undefined>(getCachedClientContributions());
  const contributionData = $derived(contributions && contributions.length > 0 ? contributions : clientContributions);

  $effect(() => {
    if (contributions && contributions.length > 0) {
      setCachedClientContributions(contributions);
    }
  });

  onMount(() => {
    if (!apiConfigured || (contributionData && contributionData.length > 0)) {
      return;
    }

    let active = true;

    const loadContributions = async () => {
      const abortController = new AbortController();
      const timeoutId = setTimeout(() => abortController.abort(), 2500);

      try {
        const response = await fetch("/api/github-contributions", { signal: abortController.signal });
        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as {
          githubContributions?: GitHubContribution[] | null;
        };

        if (!active || !payload.githubContributions) {
          return;
        }

        clientContributions = payload.githubContributions;
        setCachedClientContributions(payload.githubContributions);
      } catch {
        // Keep current fallback graph state on fetch errors.
      } finally {
        clearTimeout(timeoutId);
      }
    };

    void loadContributions();

    return () => {
      active = false;
    };
  });
</script>

<InsetPanel>
  <GitHubContributionGraph {username} data={contributionData} text={graphText} />
  {#if !apiConfigured}
    <p class="text-gray-alpha-800 mt-2 text-base">
      {missingTokenMessage}
    </p>
  {/if}
</InsetPanel>
