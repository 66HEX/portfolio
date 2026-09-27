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
  import type { HomepageContent } from "$lib/homepage";
  import { onMount } from "svelte";
  import GitHubContributionGraph from "./GitHubContributionGraph.svelte";
  import * as Card from "$lib/components/ui/card";
  import SectionBlock from "$lib/components/layout/SectionBlock.svelte";
  import CardWrapper from "$lib/components/layout/CardWrapper.svelte";

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
  let loadFinished = $state(false);
  const contributionData = $derived(contributions && contributions.length > 0 ? contributions : clientContributions);
  const loading = $derived(apiConfigured && !contributionData?.length && !loadFinished);

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
        // The graph shows its unavailable state after a failed request.
      } finally {
        clearTimeout(timeoutId);
        if (active) loadFinished = true;
      }
    };

    void loadContributions();

    return () => {
      active = false;
    };
  });
</script>

<SectionBlock>
  <CardWrapper>
    <Card.Root
      class="has-[[data-scrollable]:focus-visible]:ring-ring/50 transition-shadow has-[[data-scrollable]:focus-visible]:ring-[3px] has-[[data-scrollable]:focus-visible]:outline-1"
    >
      <Card.Content>
        <GitHubContributionGraph {username} data={contributionData} text={graphText} {loading} />
        {#if !apiConfigured}
          <p class="text-muted-foreground mt-2 text-base">
            {missingTokenMessage}
          </p>
        {/if}
      </Card.Content>
    </Card.Root>
  </CardWrapper>
</SectionBlock>
