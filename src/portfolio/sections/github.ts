import { portfolio } from "../config.ts";
import type { HomepageContent } from "../../lib/types/portfolio";

export const githubData: Pick<HomepageContent, "githubCard"> = {
  githubCard: {
    username: portfolio.githubUsername,
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
