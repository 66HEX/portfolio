<script lang="ts">
  import Tooltip from "$lib/components/ui/Tooltip.svelte";
  import { cn } from "$lib/utils/cn";
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

  const levelClasses = [
    "bg-background-muted",
    "bg-green-600/30",
    "bg-green-600/55",
    "bg-green-600/80",
    "bg-green-500",
  ] as const;

  let { username = "github", days = 364, data, text = defaultText, class: className = "" }: Props = $props();

  const state = new ContributionGraphState(() => ({ username, days, text, data }));

  const legendLevels: ContributionLevel[] = [0, 1, 2, 3, 4];
</script>

<div class={cn("bg-background card w-full rounded-md p-4", className)}>
  <div
    class="overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    role="img"
    tabindex="-1"
    aria-label={state.graphAriaLabel}
  >
    <div class="">
      <div
        class="mb-2 grid items-center gap-1"
        style={`grid-template-columns: 2rem repeat(${state.weeks.length}, 0.75rem);`}
      >
        <div></div>
        {#each state.monthLabels as label, index (`month-${index}-${label}`)}
          <div class="text-foreground-muted text-xs leading-none">{label}</div>
        {/each}
      </div>

      <div class="grid gap-1" style={`grid-template-columns: 2rem repeat(${state.weeks.length}, 0.75rem);`}>
        <div class="grid grid-rows-7 gap-1">
          {#each state.text.dayLabels as label, index (`weekday-${index}-${label}`)}
            <div class="text-foreground-muted flex h-3 items-center text-xs leading-none">
              {label}
            </div>
          {/each}
        </div>

        {#each state.weeks as week, weekIndex (week[0]?.key ?? `week-${weekIndex}`)}
          <div class="grid grid-rows-7 gap-1">
            {#each week as day (day.key)}
              <Tooltip content={day.tooltip} delay={120} class="size-3 shrink-0">
                <span
                  class={cn(
                    "size-full rounded-[3px] transition-colors duration-150",
                    levelClasses[day.level],
                    day.inRange ? "" : "opacity-40",
                  )}
                  aria-hidden="true"
                ></span>
              </Tooltip>
            {/each}
          </div>
        {/each}
      </div>
    </div>
  </div>

  <div class="mt-3 flex items-center justify-between gap-3">
    <p class="text-foreground-muted text-xs font-medium text-balance">
      {state.totalContributions}
      {text.summaryMiddleLabel}
      {state.normalizedDays}
      {text.summaryDaysLabel}
    </p>
    <div class="text-foreground-muted flex items-center gap-1 text-xs leading-none">
      <span>{text.legendLessLabel}</span>
      {#each legendLevels as level (`legend-${level}`)}
        <span class={cn("size-3 rounded-[3px]", levelClasses[level])}></span>
      {/each}
      <span>{text.legendMoreLabel}</span>
    </div>
  </div>
</div>
