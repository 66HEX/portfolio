import { env } from "$env/dynamic/private";
import { json } from "@sveltejs/kit";
import { GITHUB_USERNAME, getGitHubContributions } from "$lib/server/github-contributions";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ fetch, setHeaders, platform }) => {
  setHeaders({
    "cache-control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600",
  });

  const githubToken = platform?.env?.GITHUB_TOKEN ?? env.GITHUB_TOKEN;
  if (!githubToken) {
    return json({
      apiConfigured: false,
      githubContributions: null,
      githubUsername: GITHUB_USERNAME,
    });
  }

  const githubContributions = await getGitHubContributions(fetch, githubToken);
  return json({
    apiConfigured: true,
    githubContributions,
    githubUsername: GITHUB_USERNAME,
  });
};
