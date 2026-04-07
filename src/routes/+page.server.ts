import { env } from "$env/dynamic/private";
import { getRecentBlogPosts } from "$lib/features/blog/server/posts";
import { GITHUB_USERNAME, getGitHubContributions } from "$lib/features/github/server/contributions";
import { fetchTweet } from "$lib/features/tweets/server/fetch-tweet";
import { testimonialsData } from "$lib/content/data/testimonials";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ fetch, setHeaders, platform }) => {
  setHeaders({
    "cache-control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600",
  });

  const recentBlogPosts = getRecentBlogPosts(3);
  const githubToken = platform?.env?.GITHUB_TOKEN ?? env.GITHUB_TOKEN;
  const githubContributions = await getGitHubContributions(fetch, githubToken);

  const tweetResults = await Promise.all(testimonialsData.tweetIds.map((id) => fetchTweet(id)));
  const tweets = tweetResults.filter((t) => t !== null);

  return {
    recentBlogPosts,
    githubUsername: GITHUB_USERNAME,
    githubApiConfigured: Boolean(githubToken),
    githubContributions,
    tweets,
  };
};
