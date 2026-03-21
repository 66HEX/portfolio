import type { HomepageContent } from "../types";

export const githubData: Pick<HomepageContent, "githubCard"> = {
  githubCard: {
    username: "66HEX",
    missingTokenMessage: "Add `GITHUB_TOKEN` in environment variables to load live GitHub data.",
    graphText: {
      monthNames: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
      dayLabels: ["", "Mon", "", "Wed", "", "Fri", ""],
      legendLessLabel: "Less",
      legendMoreLabel: "More",
      summaryMiddleLabel: "contributions in the last",
      summaryDaysLabel: "days",
      contributionSingularLabel: "contribution",
      contributionPluralLabel: "contributions",
      tooltipOnLabel: "on",
    },
  },
};
