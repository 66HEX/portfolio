import { env } from "$env/dynamic/private";
import { getRecentBlogPosts } from "$lib/features/blog/server/posts";
import { GITHUB_USERNAME, getGitHubContributions } from "$lib/features/github/server/contributions";
import type { TweetData } from "$lib/features/tweets/server/fetch-tweet";
import tweetsCache from "$lib/content/data/tweets-cache.json";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ fetch, setHeaders, platform }) => {
  setHeaders({
    "cache-control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600",
  });

  const recentBlogPosts = getRecentBlogPosts(3);
  const githubToken = platform?.env?.GITHUB_TOKEN ?? env.GITHUB_TOKEN;
  const githubContributions = await getGitHubContributions(fetch, githubToken);

  const tweets = tweetsCache as TweetData[];

  return {
    recentBlogPosts,
    githubUsername: GITHUB_USERNAME,
    githubApiConfigured: Boolean(githubToken),
    githubContributions,
    tweets,
  };
};
