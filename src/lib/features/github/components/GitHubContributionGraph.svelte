<script lang="ts">
  import * as Tooltip from "$lib/components/ui/tooltip";
  import { ScrollArea } from "$lib/components/ui/scroll-area";
  import { cn } from "$lib/utils";
  import type { ContributionInput, ContributionLevel, GraphText } from "../types";
  import { ContributionGraphState } from "../utils/contribution-logic.svelte";

  type Props = {
    username?: string;
    days?: number;
    data?: ContributionInput[];
    text?: GraphText;
    class?: string;
  };

  const defaultText: GraphText = {
    monthNames: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    dayLabels: ["", "Mon", "", "Wed", "", "Fri", ""],
    legendLessLabel: "Less",
    legendMoreLabel: "More",
    summaryMiddleLabel: "contributions in the last",
    summaryDaysLabel: "days",
    contributionSingularLabel: "contribution",
    contributionPluralLabel: "contributions",
    tooltipOnLabel: "on",
  };

  const levelClasses = ["bg-muted", "bg-primary/20", "bg-primary/40", "bg-primary/65", "bg-primary/90"] as const;

  let { username = "github", days = 364, data, text = defaultText, class: className = "" }: Props = $props();

  const contributionState = new ContributionGraphState(() => ({ username, days, text, data }));

  const legendLevels: ContributionLevel[] = [0, 1, 2, 3, 4];

  let graph = $state<HTMLElement | null>(null);

  function handleGraphKeydown(event: KeyboardEvent) {
    if (!graph) return;

    switch (event.key) {
      case "ArrowLeft":
        graph.scrollLeft -= 48;
        break;
      case "ArrowRight":
        graph.scrollLeft += 48;
        break;
      case "Home":
        graph.scrollLeft = 0;
        break;
      case "End":
        graph.scrollLeft = graph.scrollWidth;
        break;
      default:
        return;
    }

    event.preventDefault();
  }
</script>

<div class={cn("w-full", className)}>
  <ScrollArea
    orientation="horizontal"
    bind:viewportRef={graph}
    focusableWhenScrollable
    fadeHorizontalEdges
    class="w-full pb-3"
    onkeydown={handleGraphKeydown}
    viewportProps={{
      role: "region",
      "aria-label": "GitHub contribution graph",
      class: "focus-visible:ring-0 focus-visible:outline-none",
    }}
  >
    <div role="img" aria-label={contributionState.graphAriaLabel}>
      <div aria-hidden="true">
        <div
          class="mb-2 grid items-center gap-1"
          style={`grid-template-columns: 2rem repeat(${contributionState.weeks.length}, 0.75rem);`}
        >
          <div></div>
          {#each contributionState.monthLabels as label, index (`month-${index}-${label}`)}
            <div class="text-muted-foreground text-xs leading-none">{label}</div>
          {/each}
        </div>

        <div
          class="grid gap-1"
          style={`grid-template-columns: 2rem repeat(${contributionState.weeks.length}, 0.75rem);`}
        >
          <div class="grid grid-rows-7 gap-1">
            {#each contributionState.text.dayLabels as label, index (`weekday-${index}-${label}`)}
              <div class="text-muted-foreground flex h-3 items-center text-xs leading-none">
                {label}
              </div>
            {/each}
          </div>

          {#each contributionState.weeks as week, weekIndex (week[0]?.key ?? `week-${weekIndex}`)}
            <div class="grid grid-rows-7 gap-1">
              {#each week as day (day.key)}
                <Tooltip.Root>
                  <!-- Each cell owns half of the 0.25rem gap, including its corners. -->
                  <Tooltip.Trigger
                    tabindex={-1}
                    aria-hidden="true"
                    class={cn(
                      "relative block size-3 shrink-0 rounded-[3px] after:absolute after:-inset-0.5 after:content-['']",
                      levelClasses[day.level],
                      day.inRange ? "" : "opacity-40",
                    )}
                  />
                  <Tooltip.Content sideOffset={6}>{day.tooltip}</Tooltip.Content>
                </Tooltip.Root>
              {/each}
            </div>
          {/each}
        </div>
      </div>
    </div>
  </ScrollArea>

  <div class="mt-3 flex items-center justify-between gap-3">
    <p class="text-muted-foreground text-xs font-medium text-balance">
      {contributionState.totalContributions}
      {text.summaryMiddleLabel}
      {contributionState.normalizedDays}
      {text.summaryDaysLabel}
    </p>
    <div class="text-muted-foreground flex items-center gap-1 text-xs leading-none">
      <span>{text.legendLessLabel}</span>
      {#each legendLevels as level (`legend-${level}`)}
        <span class={cn("size-3 rounded-[3px]", levelClasses[level])}></span>
      {/each}
      <span>{text.legendMoreLabel}</span>
    </div>
  </div>
</div>
