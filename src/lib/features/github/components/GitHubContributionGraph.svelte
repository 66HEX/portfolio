<script lang="ts">
  import ActionTooltip from "$lib/components/action-tooltip/ActionTooltip.svelte";
  import { ScrollArea } from "$lib/components/ui/scroll-area";
  import { cn } from "$lib/utils";
  import type { ContributionInput, ContributionLevel, GraphText } from "../types";
  import { ContributionGraphState } from "../utils/contribution-logic.svelte";
  import { getContributionFocusIndex } from "../utils/keyboard-navigation";

  type Props = {
    username?: string;
    days?: number;
    data?: ContributionInput[];
    loading?: boolean;
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

  let {
    username = "github",
    days = 364,
    data,
    loading = false,
    text = defaultText,
    class: className = "",
  }: Props = $props();

  const contributionState = new ContributionGraphState(() => ({ username, days, text, data }));

  const legendLevels: ContributionLevel[] = [0, 1, 2, 3, 4];

  let graph = $state<HTMLElement | null>(null);
  let activeDate = $state<string | null>(null);
  const id = $props.id();
  const firstDayIndex = $derived(contributionState.dayCells.findIndex((day) => day.inRange));
  const lastDayIndex = $derived(contributionState.dayCells.findLastIndex((day) => day.inRange));
  const activeDay = $derived(
    contributionState.dayCells.find((day) => day.inRange && day.key === activeDate)?.key ??
      contributionState.dayCells[lastDayIndex]?.key,
  );

  function handleGraphKeydown(event: KeyboardEvent) {
    if (!graph || !(event.target instanceof HTMLElement) || event.altKey) return;
    const index = event.target.dataset.contributionIndex;
    if (index === undefined) return;
    const next = getContributionFocusIndex(
      Number(index),
      firstDayIndex,
      lastDayIndex,
      event.key,
      event.ctrlKey || event.metaKey,
    );
    if (next === null) return;

    event.preventDefault();
    graph.querySelector<HTMLElement>(`[data-contribution-index="${next}"]`)?.focus({ preventScroll: true });
  }

  function handleDayFocus(event: FocusEvent) {
    if (!graph || !(event.target instanceof HTMLElement)) return;
    const index = event.target.dataset.contributionIndex;
    if (index === undefined) return;
    activeDate = contributionState.dayCells[Number(index)].key;

    const cell = event.target.getBoundingClientRect();
    const viewport = graph.getBoundingClientRect();
    // Keep the focus indicator and cell out of the scroll area's edge fades.
    if (cell.left < viewport.left + 28) graph.scrollLeft += cell.left - viewport.left - 28;
    else if (cell.right > viewport.right - 28) graph.scrollLeft += cell.right - viewport.right + 28;
  }
</script>

<div class={cn("w-full", className)}>
  {#if contributionState.dayCells.length > 0}
    <ScrollArea
      orientation="horizontal"
      bind:viewportRef={graph}
      fadeHorizontalEdges
      class="w-full pb-3"
      viewportProps={{ tabindex: -1 }}
    >
      <p id={`${id}-instructions`} class="sr-only">
        Use arrow keys to move between days. Home and End move to the first and last week in a row. Control plus Home or
        End moves to the earliest or latest day. Tab leaves the graph.
      </p>
      <div
        class="mb-2 grid items-center gap-1"
        style={`grid-template-columns: 2rem repeat(${contributionState.weeks.length}, 0.75rem);`}
        aria-hidden="true"
      >
        <div></div>
        {#each contributionState.monthLabels as label, index (`month-${index}-${label}`)}
          <div class="text-muted-foreground text-xs leading-none">{label}</div>
        {/each}
      </div>

      <div
        class="grid gap-1"
        role="grid"
        tabindex={-1}
        aria-label="GitHub contribution graph"
        aria-describedby={`${id}-summary ${id}-instructions`}
        onkeydown={handleGraphKeydown}
        onfocusin={handleDayFocus}
      >
        {#each contributionState.text.dayLabels as label, index (`weekday-${index}-${label}`)}
          <div
            role="row"
            class="grid gap-1"
            style={`grid-template-columns: 2rem repeat(${contributionState.weeks.length}, 0.75rem);`}
          >
            <div
              role="rowheader"
              aria-label={["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][index]}
              class="text-muted-foreground flex h-3 items-center text-xs leading-none"
            >
              {label}
            </div>
            {#each contributionState.weeks as week, weekIndex (week[0]?.key ?? `week-${weekIndex}`)}
              {@const day = week[index]}
              {#if day.inRange}
                <ActionTooltip content={day.tooltip} sideOffset={6}>
                  {#snippet trigger({ props })}
                    <!-- Each cell owns half of the 0.25rem gap, including its corners. -->
                    <button
                      {...props}
                      type="button"
                      role="gridcell"
                      tabindex={day.key === activeDay ? 0 : -1}
                      aria-label={day.tooltip}
                      data-contribution-index={weekIndex * 7 + index}
                      class={cn(
                        "focus-visible:outline-foreground relative block size-3 shrink-0 rounded-[3px] after:absolute after:-inset-0.5 after:content-[''] focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-2",
                        levelClasses[day.level],
                      )}
                    ></button>
                  {/snippet}
                </ActionTooltip>
              {:else}
                <span
                  role="gridcell"
                  aria-disabled="true"
                  aria-label="Outside displayed range"
                  class="bg-muted block size-3 rounded-[3px] opacity-40"
                ></span>
              {/if}
            {/each}
          </div>
        {/each}
      </div>
    </ScrollArea>

    <div class="mt-3 flex items-center justify-between gap-3">
      <p id={`${id}-summary`} class="text-muted-foreground text-xs font-medium text-balance">
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
  {:else}
    <p class="text-muted-foreground flex min-h-44 items-center justify-center text-sm" role="status">
      {loading ? "Loading GitHub activity…" : "GitHub activity is currently unavailable."}
    </p>
  {/if}
</div>
