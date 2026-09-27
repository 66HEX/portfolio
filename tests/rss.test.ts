import assert from "node:assert/strict";
import { test } from "node:test";
import { XMLParser, XMLValidator } from "fast-xml-parser";
import { buildRssFeed, createRssResponse, type FeedEntry } from "../src/lib/features/writing/server/rss.ts";
import { renderFeedHtml } from "../tooling/markdown/feed.ts";

const site = {
  title: "Marek Jóźwiak — Writing",
  description: "Software & design",
  url: "https://example.com/",
  feedUrl: "https://example.com/rss.xml",
  language: "en",
  author: "Marek Jóźwiak",
};

const local: FeedEntry = {
  title: "A local article",
  description: "Article summary",
  date: "2026-07-08",
  href: "https://example.com/blog/local",
  published: true,
  categories: ["rust", "desktop"],
  html: "<p>The full article.</p>",
};

function parseFeed(xml: string) {
  assert.equal(XMLValidator.validate(xml), true);
  return new XMLParser({
    ignoreAttributes: false,
    parseTagValue: false,
    isArray: (name) => name === "item" || name === "category",
  }).parse(xml).rss;
}

test("RSS combines all published articles by date, retaining metadata and excluding drafts", () => {
  const external: FeedEntry = {
    title: "An external article",
    description: "Published on Codrops. Article summary.",
    date: "2026-09-06",
    href: "https://publisher.example/article",
    published: true,
  };
  const entries = [local, external, { ...local, title: "Secret draft", published: false }];
  const rss = parseFeed(buildRssFeed(site, entries));
  assert.equal(rss["@_version"], "2.0");
  assert.equal(rss.channel.title, site.title);
  assert.equal(rss.channel.language, "en");
  assert.equal(rss.channel["atom:link"]["@_href"], site.feedUrl);
  assert.equal(rss.channel["atom:link"]["@_rel"], "self");
  assert.equal(rss.channel.pubDate, "Sun, 06 Sep 2026 00:00:00 GMT");
  const [newest, oldest] = rss.channel.item;
  assert.equal(rss.channel.item.length, 2);
  assert.equal(newest.link, external.href);
  assert.equal(newest.description, external.description);
  assert.equal(newest["content:encoded"], undefined);
  assert.equal(oldest["content:encoded"], local.html);
  assert.deepEqual(oldest.category, local.categories);
  assert.equal(oldest["dc:creator"], site.author);
  assert.equal(oldest.guid["@_isPermaLink"], "true");
  assert.equal(oldest.guid["#text"], local.href);
  assert.equal(entries[0], local, "sorting must not reorder the source data");

  const edited = parseFeed(buildRssFeed(site, [{ ...local, title: "Edited", html: "<p>New content</p>" }]));
  assert.deepEqual(edited.channel.item[0].guid, oldest.guid, "edits must not create a duplicate in a reader");
  const archive = Array.from({ length: 30 }, (_, index) => ({ ...local, href: `${local.href}-${index}` }));
  assert.equal(parseFeed(buildRssFeed(site, archive)).channel.item.length, archive.length);
});

test("XML text and HTML round-trip ampersands, Unicode, markup and CDATA terminators", () => {
  const entry = {
    ...local,
    title: 'Quotes " & <tags> — Jóźwiak',
    href: "https://example.com/post?a=1&b=2",
    description: "A <tag> & text",
    html: '<p>A &amp; B, literal ]]&gt;, and a CDATA terminator: ]]></p><img src="https://example.com/a.png">',
  };
  const rss = parseFeed(buildRssFeed(site, [entry]));
  assert.equal(rss.channel.description, site.description);
  const item = rss.channel.item[0];
  assert.equal(item.title, entry.title);
  assert.equal(item.link, entry.href);
  assert.equal(item.description, "A &lt;tag&gt; &amp; text");
  assert.equal(item["content:encoded"], entry.html);
});

test("an empty feed remains valid and omits a fabricated publication date", () => {
  const channel = parseFeed(buildRssFeed(site, [{ ...local, published: false }])).channel;
  assert.equal(channel.item, undefined);
  assert.equal(channel.pubDate, undefined);
  assert.equal(channel.link, site.url);
});

test("feed HTML preserves Markdown structure and code with absolute links and images", async () => {
  const html = await renderFeedHtml(
    [
      "## Heading",
      "[Related](../related) [Section](#heading) ![Example](/images/example.png)",
      "| Name | Value |\n| --- | --- |\n| A | B |",
      "- [x] Done\n- [ ] Pending",
      '```svelte\n<script>const text = "<tag> {value}";</script>\n```',
      "<p>Inline HTML <strong>also works</strong>.</p>",
    ].join("\n\n"),
    "https://example.com/blog/nested/article",
  );
  assert.ok(html.includes('<h2 id="user-content-heading">Heading</h2>'));
  assert.ok(html.includes('href="https://example.com/blog/related"'));
  assert.ok(html.includes('href="https://example.com/blog/nested/article#heading"'));
  assert.ok(html.includes('src="https://example.com/images/example.png"'));
  assert.ok(html.includes("<table>"));
  assert.ok(html.includes('type="checkbox"'));
  assert.ok(html.includes('<pre><code class="language-svelte">'));
  assert.ok(html.includes('&#x3C;script>const text = "&#x3C;tag> {value}";&#x3C;/script>'));
  assert.ok(html.includes("<strong>also works</strong>"));
});

test("feed HTML removes scripts, handlers and unsafe URLs from authored HTML", async () => {
  const html = await renderFeedHtml(
    '<script>alert("secret")</script>\n\n<a href="javascript:alert(1)">Unsafe</a><img src="/safe.png" onerror="alert(1)"><iframe src="https://example.com"></iframe>',
    "https://example.com/blog/article",
  );
  assert.doesNotMatch(html, /script|secret|javascript:|onerror|iframe/);
  assert.ok(html.includes('src="https://example.com/safe.png"'));
});

test("tables do not create blank gaps and code retains significant whitespace", async () => {
  const code = "first\n\n\n  indented\n";
  const html = await renderFeedHtml(
    [
      "Before the table.",
      "| Change | Behavior |\n| --- | --- |\n| A | B |\n| C | D |",
      "After the table with <em>inline</em> text.",
      `\u0060\u0060\u0060text\n${code}\u0060\u0060\u0060`,
      `<pre>${code}</pre>`,
    ].join("\n\n"),
    "https://example.com/blog/article",
  );
  assert.ok(html.includes("<p>Before the table.</p>\n<table>"));
  assert.ok(html.includes("</table>\n<p>After the table with <em>inline</em> text.</p>"));
  assert.ok(html.includes("<td>A</td><td>B</td>"));
  assert.ok(html.includes(`<pre><code class="language-text">${code}</code></pre>`));
  assert.ok(html.includes(`<pre>${code}</pre>`));
});

test("conditional requests return 304 only for the current feed representation", async () => {
  const xml = buildRssFeed(site, [local]);
  const request = new Request(site.feedUrl);
  const response = await createRssResponse(request, xml);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "application/rss+xml; charset=utf-8");
  assert.ok(response.headers.get("cache-control")?.includes("s-maxage=3600"));
  assert.equal(await response.text(), xml);
  const etag = response.headers.get("etag")!;
  for (const value of [etag, etag.slice(2), `"older", ${etag}`, "*"]) {
    const cached = await createRssResponse(new Request(site.feedUrl, { headers: { "If-None-Match": value } }), xml);
    assert.equal(cached.status, 304);
    assert.equal(await cached.text(), "");
    assert.equal(cached.headers.get("etag"), etag);
  }
  const changed = await createRssResponse(
    new Request(site.feedUrl, { headers: { "If-None-Match": etag } }),
    buildRssFeed(site, [{ ...local, html: "<p>Updated article.</p>" }]),
  );
  assert.equal(changed.status, 200);
  assert.notEqual(changed.headers.get("etag"), etag);
});
