import { readFile, writeFile, rename } from "node:fs/promises";
import { testimonialsData } from "../src/portfolio/sections/testimonials.ts";
import { fetchTweet } from "../src/lib/features/tweets/server/fetch-tweet.ts";
import type { TweetData } from "../src/lib/features/tweets/types.ts";

const path = new URL("../src/portfolio/cache/tweets.json", import.meta.url);
const cached = JSON.parse(await readFile(path, "utf8")) as TweetData[];
const previous = new Map(cached.map((tweet) => [tweet.id_str, tweet]));
const results = await Promise.allSettled(testimonialsData.tweetIds.map(fetchTweet));
let failed = 0;
const tweets = results.flatMap((result, index) => {
  const id = testimonialsData.tweetIds[index];
  const fresh = result.status === "fulfilled" ? result.value : null;
  if (fresh) return [fresh];
  failed++;
  const existing = previous.get(id);
  console.warn(`[tweets] ${id}: unavailable; ${existing ? "keeping cached version" : "no cached version"}.`);
  return existing ? [existing] : [];
});
const temporary = new URL("../src/portfolio/cache/tweets.json.tmp", import.meta.url);
await writeFile(temporary, JSON.stringify(tweets, null, 2) + "\n");
await rename(temporary, path);
console.log(
  `[tweets] ${tweets.length}/${testimonialsData.tweetIds.length} available. Commit src/portfolio/cache/tweets.json with your content changes.`,
);
if (failed) process.exitCode = 1;
