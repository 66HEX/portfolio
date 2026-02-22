<script lang="ts">
  import Tooltip from "$lib/components/ui/Tooltip.svelte";
  import { cn } from "$lib/utils/cn";

  type ContributionInput = {
    date: Date | string;
    count: number;
  };

  type ContributionLevel = 0 | 1 | 2 | 3 | 4;

  type ContributionDay = {
    key: string;
    date: Date;
    count: number;
    level: ContributionLevel;
    tooltip: string;
    inRange: boolean;
  };

  type Props = {
    username?: string;
    days?: number;
    data?: ContributionInput[];
    text?: GraphText;
    class?: string;
  };

  type GraphText = {
    monthNames: string[];
    dayLabels: string[];
    legendLessLabel: string;
    legendMoreLabel: string;
    summaryMiddleLabel: string;
    summaryDaysLabel: string;
    contributionSingularLabel: string;
    contributionPluralLabel: string;
    tooltipOnLabel: string;
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
    "bg-gray-alpha-100",
    "bg-green-700/30",
    "bg-green-700/55",
    "bg-green-700/80",
    "bg-green-600",
  ] as const;
  const dateFormatter = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  let { username = "madebyhex", days = 364, data, text = defaultText, class: className = "" }: Props = $props();

  const monthNames = $derived(text.monthNames);
  const dayLabels = $derived(text.dayLabels);
  const normalizedDays = $derived(Math.max(7, days));
  const inputData = $derived(data && data.length > 0 ? data : generateMockContributions(username, normalizedDays));
  const dayCells = $derived(buildContributionDays(inputData, normalizedDays));
  const weeks = $derived(groupByWeek(dayCells));
  const monthLabels = $derived(buildMonthLabels(weeks));
  const totalContributions = $derived(dayCells.filter((day) => day.inRange).reduce((sum, day) => sum + day.count, 0));
  const legendLevels: ContributionLevel[] = [0, 1, 2, 3, 4];
  const contributionLabel = $derived(
    totalContributions === 1 ? text.contributionSingularLabel : text.contributionPluralLabel,
  );
  const graphAriaLabel = $derived(
    `${totalContributions} ${contributionLabel} ${text.summaryMiddleLabel} ${normalizedDays} ${text.summaryDaysLabel}.`,
  );

  function toStartOfDay(value: Date | string): Date {
    const date = new Date(value);
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  function addDays(date: Date, amount: number): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount);
  }

  function toDateKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function hashText(value: string): number {
    let hash = 0;
    for (let i = 0; i < value.length; i += 1) {
      hash = (hash << 5) - hash + value.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }

  function seededNoise(seed: number): number {
    const x = Math.sin(seed * 12.9898) * 43758.5453;
    return x - Math.floor(x);
  }

  function mapCountToLevel(count: number): ContributionLevel {
    if (count <= 0) return 0;
    if (count <= 2) return 1;
    if (count <= 5) return 2;
    if (count <= 9) return 3;
    return 4;
  }

  function formatTooltip(count: number, date: Date): string {
    const label = count === 1 ? text.contributionSingularLabel : text.contributionPluralLabel;
    return `${count} ${label} ${text.tooltipOnLabel} ${dateFormatter.format(date)}`;
  }

  function generateMockContributions(handle: string, amountOfDays: number): ContributionInput[] {
    const seed = hashText(handle);
    const end = toStartOfDay(new Date());
    const start = addDays(end, -(amountOfDays - 1));

    const values: ContributionInput[] = [];
    for (let i = 0; i < amountOfDays; i += 1) {
      const date = addDays(start, i);
      const weekday = date.getDay();
      const weekendFactor = weekday === 0 || weekday === 6 ? 0.65 : 1;
      const wave = (Math.sin((i + (seed % 17)) / 13) + 1) * 0.5;
      const noise = seededNoise(seed + i * 37 + date.getMonth() * 91);

      let count = Math.round((wave * 7 + noise * 6) * weekendFactor);
      if (noise < 0.38) {
        count = 0;
      }

      values.push({
        date,
        count: Math.max(0, count),
      });
    }

    return values;
  }

  function buildContributionDays(input: ContributionInput[], amountOfDays: number): ContributionDay[] {
    const cleaned = input
      .map((item) => ({
        date: toStartOfDay(item.date),
        count: Math.max(0, Math.floor(item.count ?? 0)),
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    const lastDays = cleaned.slice(-amountOfDays);
    if (lastDays.length === 0) {
      return [];
    }

    const missing = amountOfDays - lastDays.length;
    const paddingBefore =
      missing > 0
        ? Array.from({ length: missing }, (_, index) => {
            const first = lastDays[0].date;
            const date = addDays(first, -(missing - index));
            return { date, count: 0 };
          })
        : [];

    const rangeValues = [...paddingBefore, ...lastDays];
    const rangeStart = rangeValues[0].date;
    const rangeEnd = rangeValues[rangeValues.length - 1].date;

    const gridStart = addDays(rangeStart, -rangeStart.getDay());
    const gridEnd = addDays(rangeEnd, 6 - rangeEnd.getDay());

    const byDate = new Map<string, number>(rangeValues.map((item) => [toDateKey(item.date), item.count]));

    const daysInGrid: ContributionDay[] = [];
    for (let cursor = new Date(gridStart); cursor.getTime() <= gridEnd.getTime(); cursor = addDays(cursor, 1)) {
      const key = toDateKey(cursor);
      const count = byDate.get(key) ?? 0;
      const inRange = cursor.getTime() >= rangeStart.getTime() && cursor.getTime() <= rangeEnd.getTime();

      daysInGrid.push({
        key,
        date: new Date(cursor),
        count,
        level: mapCountToLevel(count),
        tooltip: formatTooltip(count, cursor),
        inRange,
      });
    }

    return daysInGrid;
  }

  function groupByWeek(days: ContributionDay[]): ContributionDay[][] {
    const result: ContributionDay[][] = [];
    for (let i = 0; i < days.length; i += 7) {
      result.push(days.slice(i, i + 7));
    }
    return result;
  }

  function buildMonthLabels(weekColumns: ContributionDay[][]): string[] {
    const monthStartLabels = weekColumns.map((week, index) => {
      const date = week[0]?.date;
      if (!date) return "";
      if (index === 0) return monthNames[date.getMonth()];

      const previousDate = weekColumns[index - 1]?.[0]?.date;
      if (!previousDate) return monthNames[date.getMonth()];
      return previousDate.getMonth() === date.getMonth() ? "" : monthNames[date.getMonth()];
    });

    // Avoid overlapping month labels when month boundaries are too close (e.g. end/start of month).
    const minColumnGap = 3;
    const resolvedLabels = Array.from({ length: monthStartLabels.length }, () => "");
    let lastVisibleIndex = -1;

    for (let i = 0; i < monthStartLabels.length; i += 1) {
      const label = monthStartLabels[i];
      if (!label) {
        continue;
      }

      if (lastVisibleIndex >= 0 && i - lastVisibleIndex < minColumnGap) {
        resolvedLabels[lastVisibleIndex] = "";
      }

      resolvedLabels[i] = label;
      lastVisibleIndex = i;
    }

    return resolvedLabels;
  }
</script>

<div class={cn("w-full p-0", className)}>
  <div class="custom-scrollbar overflow-x-auto pb-1" role="img" tabindex="-1" aria-label={graphAriaLabel}>
    <div class="">
      <div class="mb-2 grid items-center gap-1" style={`grid-template-columns: 2rem repeat(${weeks.length}, 0.75rem);`}>
        <div></div>
        {#each monthLabels as label, index (`month-${index}-${label}`)}
          <div class="text-gray-alpha-800 text-xs">{label}</div>
        {/each}
      </div>

      <div class="grid gap-1" style={`grid-template-columns: 2rem repeat(${weeks.length}, 0.75rem);`}>
        <div class="grid grid-rows-7 gap-1">
          {#each dayLabels as label, index (`weekday-${index}-${label}`)}
            <div class="text-gray-alpha-800 flex h-3 items-center text-xs">
              {label}
            </div>
          {/each}
        </div>

        {#each weeks as week, weekIndex (week[0]?.key ?? `week-${weekIndex}`)}
          <div class="grid grid-rows-7 gap-1">
            {#each week as day (day.key)}
              <Tooltip content={day.tooltip} delay={120} class="size-3 shrink-0">
                <span
                  class={cn(
                    "border-gray-alpha-100/30 size-full rounded-xs border transition-colors duration-150",
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
    <p class="text-gray-alpha-800 text-xs font-medium">
      {totalContributions}
      {text.summaryMiddleLabel}
      {normalizedDays}
      {text.summaryDaysLabel}
    </p>
    <div class="text-gray-alpha-800 flex items-center gap-1 text-xs">
      <span>{text.legendLessLabel}</span>
      {#each legendLevels as level (`legend-${level}`)}
        <span class={cn("border-gray-alpha-100/30 size-3 rounded-xs border", levelClasses[level])}></span>
      {/each}
      <span>{text.legendMoreLabel}</span>
    </div>
  </div>
</div>
