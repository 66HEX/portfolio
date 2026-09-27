import { portfolio } from "$portfolio/config";
import { testimonialsData } from "$portfolio/sections/testimonials";
import { env } from "$env/dynamic/private";
import { getRecentWritingPosts } from "$lib/features/writing/server/posts";
import { GITHUB_USERNAME, getGitHubContributions } from "$lib/features/github/server/contributions";
import type { TweetData } from "$lib/features/tweets/server/fetch-tweet";
import tweetsCache from "$portfolio/cache/tweets.json";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ fetch, setHeaders, platform }) => {
  setHeaders({
    "cache-control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600",
  });

  const recentWritingPosts = portfolio.sections.includes("writing") ? getRecentWritingPosts() : [];
  const githubToken = platform?.env?.GITHUB_TOKEN ?? env.GITHUB_TOKEN;
  const githubContributions = portfolio.sections.includes("github")
    ? await getGitHubContributions(fetch, githubToken)
    : null;

  const cachedTweets = new Map((tweetsCache as TweetData[]).map((tweet) => [tweet.id_str, tweet]));
  const tweets = portfolio.sections.includes("testimonials")
    ? testimonialsData.tweetIds.flatMap((id) => {
        const tweet = cachedTweets.get(id);
        return tweet ? [tweet] : [];
      })
    : [];

  return {
    recentWritingPosts,
    githubUsername: GITHUB_USERNAME,
    githubApiConfigured: Boolean(githubToken),
    githubContributions,
    tweets,
  };
};
