import { env } from "$env/dynamic/private";
import { getRecentBlogPosts } from "$lib/blog/posts";
import { GITHUB_USERNAME, getGitHubContributions } from "$lib/server/github-contributions";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ fetch, setHeaders, platform }) => {
  setHeaders({
    "cache-control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600",
  });

  const recentBlogPosts = getRecentBlogPosts(3);
  const githubToken = platform?.env?.GITHUB_TOKEN ?? env.GITHUB_TOKEN;
  const githubContributions = await getGitHubContributions(fetch, githubToken);

  return {
    recentBlogPosts,
    githubUsername: GITHUB_USERNAME,
    githubApiConfigured: Boolean(githubToken),
    githubContributions,
  };
};
