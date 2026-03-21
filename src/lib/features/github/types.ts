export type ContributionInput = {
  date: Date | string;
  count: number;
};

export type ContributionLevel = 0 | 1 | 2 | 3 | 4;

export type ContributionDay = {
  key: string;
  date: Date;
  count: number;
  level: ContributionLevel;
  tooltip: string;
  inRange: boolean;
};

export type GraphText = {
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
