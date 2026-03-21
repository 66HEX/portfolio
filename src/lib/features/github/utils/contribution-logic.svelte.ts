import type { ContributionDay, ContributionInput, ContributionLevel, GraphText } from "../types";
import { SvelteDate, SvelteMap } from "svelte/reactivity";

export function toStartOfDay(value: Date | string): Date {
  const date = new SvelteDate(value);
  return new SvelteDate(date.getFullYear(), date.getMonth(), date.getDate());
}

export function addDays(date: Date, amount: number): Date {
  return new SvelteDate(date.getFullYear(), date.getMonth(), date.getDate() + amount);
}

export function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function hashText(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function seededNoise(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

export function mapCountToLevel(count: number): ContributionLevel {
  if (count <= 0) return 0;
  if (count <= 2) return 1;
  if (count <= 5) return 2;
  if (count <= 9) return 3;
  return 4;
}

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

export function formatTooltip(count: number, date: Date, text: GraphText): string {
  const label = count === 1 ? text.contributionSingularLabel : text.contributionPluralLabel;
  return `${count} ${label} ${text.tooltipOnLabel} ${dateFormatter.format(date)}`;
}

export function generateMockContributions(handle: string, amountOfDays: number): ContributionInput[] {
  const seed = hashText(handle);
  const end = toStartOfDay(new SvelteDate());
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

export function buildContributionDays(
  input: ContributionInput[],
  amountOfDays: number,
  text: GraphText,
): ContributionDay[] {
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

  const byDate = new SvelteMap<string, number>(rangeValues.map((item) => [toDateKey(item.date), item.count]));

  const daysInGrid: ContributionDay[] = [];
  for (
    let cursor: Date = new SvelteDate(gridStart);
    cursor.getTime() <= gridEnd.getTime();
    cursor = addDays(cursor, 1)
  ) {
    const key = toDateKey(cursor);
    const count = byDate.get(key) ?? 0;
    const inRange = cursor.getTime() >= rangeStart.getTime() && cursor.getTime() <= rangeEnd.getTime();

    daysInGrid.push({
      key,
      date: new SvelteDate(cursor),
      count,
      level: mapCountToLevel(count),
      tooltip: formatTooltip(count, cursor, text),
      inRange,
    });
  }

  return daysInGrid;
}

export function groupByWeek(days: ContributionDay[]): ContributionDay[][] {
  const result: ContributionDay[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    result.push(days.slice(i, i + 7));
  }
  return result;
}

export function buildMonthLabels(weekColumns: ContributionDay[][], monthNames: string[]): string[] {
  const monthStartLabels = weekColumns.map((week, index) => {
    const date = week[0]?.date;
    if (!date) return "";
    if (index === 0) return monthNames[date.getMonth()];

    const previousDate = weekColumns[index - 1]?.[0]?.date;
    if (!previousDate) return monthNames[date.getMonth()];
    return previousDate.getMonth() === date.getMonth() ? "" : monthNames[date.getMonth()];
  });

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

export class ContributionGraphState {
  username: string;
  days: number;
  text: GraphText;
  data: ContributionInput[] | undefined;

  normalizedDays: number;
  inputData: ContributionInput[];
  dayCells: ContributionDay[];
  weeks: ContributionDay[][];
  monthNames: string[];
  monthLabels: string[];
  totalContributions: number;

  contributionLabel: string;
  graphAriaLabel: string;

  constructor(
    getProps: () => {
      username: string;
      days: number;
      text: GraphText;
      data?: ContributionInput[];
    },
  ) {
    this.username = $derived.by(() => getProps().username);
    this.days = $derived.by(() => getProps().days);
    this.text = $derived.by(() => getProps().text);
    this.data = $derived.by(() => getProps().data);

    this.normalizedDays = $derived.by(() => Math.max(7, this.days));
    this.inputData = $derived.by(() =>
      this.data && this.data.length > 0 ? this.data : generateMockContributions(this.username, this.normalizedDays),
    );
    this.dayCells = $derived.by(() => buildContributionDays(this.inputData, this.normalizedDays, this.text));
    this.weeks = $derived.by(() => groupByWeek(this.dayCells));
    this.monthNames = $derived.by(() => this.text.monthNames);
    this.monthLabels = $derived.by(() => buildMonthLabels(this.weeks, this.monthNames));
    this.totalContributions = $derived.by(() =>
      this.dayCells.filter((day) => day.inRange).reduce((sum, day) => sum + day.count, 0),
    );

    this.contributionLabel = $derived.by(() =>
      this.totalContributions === 1 ? this.text.contributionSingularLabel : this.text.contributionPluralLabel,
    );

    this.graphAriaLabel = $derived.by(
      () =>
        `${this.totalContributions} ${this.contributionLabel} ${this.text.summaryMiddleLabel} ${this.normalizedDays} ${this.text.summaryDaysLabel}.`,
    );
  }
}
