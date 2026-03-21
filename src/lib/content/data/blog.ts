import type { HomepageContent } from "../types";

export const blogData: Pick<HomepageContent, "blog"> = {
  blog: {
    title: "Blog",
    emptyStateLabel: "No blog posts yet.",
    readArticleLabel: "Read article",
  },
};
