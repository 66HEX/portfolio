type GitHubGraphQLResponse = {
  data?: {
    user?: {
      contributionsCollection?: {
        contributionCalendar?: {
          weeks?: Array<{
            contributionDays?: Array<{
              contributionCount?: number;
              date?: string;
            }>;
          }>;
        };
      };
    };
  };
};

export type GitHubContribution = {
  date: string;
  count: number;
};

export const GITHUB_USERNAME = "66HEX";

const GITHUB_GRAPHQL_URL = "https://api.github.com/graphql";
const GRAPH_DAYS = 364;
const GITHUB_TIMEOUT_MS = 1200;
const GITHUB_CACHE_TTL_MS = 5 * 60 * 1000;
const IN_FLIGHT_STALE_MS = 10 * 1000;

const contributionsQuery = `
query Contributions($login: String!, $from: DateTime!, $to: DateTime!) {
  user(login: $login) {
    contributionsCollection(from: $from, to: $to) {
      contributionCalendar {
        weeks {
          contributionDays {
            contributionCount
            date
          }
        }
      }
    }
  }
}
`;

let cache: {
  expiresAt: number;
  data: GitHubContribution[] | null;
} | null = null;

let inFlight: Promise<GitHubContribution[] | null> | null = null;
let inFlightStartedAt = 0;

function hasFreshCache(): boolean {
  return Boolean(cache && Date.now() < cache.expiresAt);
}

function buildRequestRange() {
  const to = new Date();
  const from = new Date(to);
  from.setDate(to.getDate() - (GRAPH_DAYS - 1));
  return { from, to };
}

async function requestGitHubContributions(fetchFn: typeof fetch, token: string): Promise<GitHubContribution[] | null> {
  const { from, to } = buildRequestRange();
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), GITHUB_TIMEOUT_MS);

  try {
    const response = await fetchFn(GITHUB_GRAPHQL_URL, {
      method: "POST",
      signal: abortController.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "User-Agent": "portfolio",
      },
      body: JSON.stringify({
        query: contributionsQuery,
        variables: {
          login: GITHUB_USERNAME,
          from: from.toISOString(),
          to: to.toISOString(),
        },
      }),
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as GitHubGraphQLResponse;
    const weeks = payload.data?.user?.contributionsCollection?.contributionCalendar?.weeks ?? [];

    const contributions = weeks
      .flatMap((week) => week.contributionDays ?? [])
      .map((day) => ({
        date: day.date ?? "",
        count: Math.max(0, day.contributionCount ?? 0),
      }))
      .filter((day) => day.date.length > 0);

    return contributions.length > 0 ? contributions : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

function startRefresh(fetchFn: typeof fetch, token: string): Promise<GitHubContribution[] | null> {
  if (inFlight && Date.now() - inFlightStartedAt < IN_FLIGHT_STALE_MS) {
    return inFlight;
  }

  if (inFlight) {
    inFlight = null;
    inFlightStartedAt = 0;
  }

  inFlightStartedAt = Date.now();

  inFlight = Promise.race([
    requestGitHubContributions(fetchFn, token),
    new Promise<GitHubContribution[] | null>((resolve) => {
      setTimeout(() => resolve(null), GITHUB_TIMEOUT_MS + 400);
    }),
  ])
    .then((data) => {
      cache = {
        data,
        expiresAt: Date.now() + GITHUB_CACHE_TTL_MS,
      };
      return data;
    })
    .finally(() => {
      inFlight = null;
      inFlightStartedAt = 0;
    });

  return inFlight;
}

export function getCachedGitHubContributions(): GitHubContribution[] | null {
  return cache?.data ?? null;
}

export function warmGitHubContributions(fetchFn: typeof fetch, token: string | undefined): void {
  if (!token || hasFreshCache()) {
    return;
  }

  void startRefresh(fetchFn, token);
}

export async function getGitHubContributions(
  fetchFn: typeof fetch,
  token: string | undefined,
): Promise<GitHubContribution[] | null> {
  if (!token) {
    return null;
  }

  if (hasFreshCache()) {
    return cache?.data ?? null;
  }

  return startRefresh(fetchFn, token);
}
