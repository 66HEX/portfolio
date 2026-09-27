import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { createPost, slugify } from "../scripts/new-post.ts";
import { readPosts } from "../scripts/content.ts";
import { portfolioSchema } from "../scripts/validate.ts";
import { portfolio } from "../src/portfolio/config.ts";
import { postMetadataSchema, postSlugSchema, externalPostSchema } from "../src/lib/features/blog/schema.ts";
import { compile } from "mdsvex";
import { tableCellFormatter } from "../tooling/markdown/tables.js";
import { highlightCode } from "../tooling/markdown/highlight.js";

const metadata = { title: "Test", description: "Description", date: "2026-09-27" };

test("metadata requires real dates and meaningful fields, with drafts as the default", () => {
  assert.equal(postMetadataSchema.parse(metadata).published, false);
  for (const date of ["2026-02-30", "yesterday", "09/27/2026"]) {
    assert.equal(postMetadataSchema.safeParse({ ...metadata, date }).success, false);
  }
  assert.equal(postMetadataSchema.safeParse({ ...metadata, title: " " }).success, false);
  assert.equal(
    externalPostSchema.safeParse({ ...metadata, href: "javascript:alert(1)", source: "codrops" }).success,
    false,
  );
});

test("slugs reject traversal, framework paths and reserved endpoints", () => {
  for (const slug of ["../escape", "og/test", "raw", "hello world", "A-post", "+page", "a//b"]) {
    assert.equal(postSlugSchema.safeParse(slug).success, false, slug);
  }
  assert.equal(postSlugSchema.parse("notes/first-post"), "notes/first-post");
  assert.equal(slugify("Zażółć gęślą jaźń"), "zazolc-gesla-jazn");
});

test("creating a draft round-trips frontmatter and refuses to overwrite it", async () => {
  const directory = await mkdtemp(join(tmpdir(), "portfolio-post-"));
  try {
    const title = 'A "quoted" title: with punctuation';
    const post = await createPost(directory, title, "notes/my-post", "2026-09-27");
    const before = await readFile(post.path, "utf8");
    const [parsed] = await readPosts(directory);
    assert.equal(parsed.title, title);
    assert.equal(parsed.slug, "notes/my-post");
    assert.equal(parsed.published, false);
    await assert.rejects(createPost(directory, "Replacement", "notes/my-post"), { code: "EEXIST" });
    assert.equal(await readFile(post.path, "utf8"), before);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("configuration rejects duplicate sections, invalid origins and negative limits", () => {
  assert.equal(portfolioSchema.safeParse(portfolio).success, true);
  assert.equal(portfolioSchema.safeParse({ ...portfolio, sections: ["writing", "writing"] }).success, false);
  assert.equal(portfolioSchema.safeParse({ ...portfolio, writing: { limit: -1 } }).success, false);
  for (const url of [
    "https://example.com/subpath",
    "https://example.com?query=1",
    "https://example.com#hash",
    "https://user:pass@example.com",
  ]) {
    assert.equal(portfolioSchema.safeParse({ ...portfolio, url }).success, false, url);
  }
  assert.equal(
    portfolioSchema.safeParse({ ...portfolio, sections: ["writing", "projects"], writing: { limit: 0 } }).success,
    true,
  );
});

test("an empty portfolio can omit the posts directory", async () => {
  const directory = await mkdtemp(join(tmpdir(), "portfolio-empty-"));
  try {
    assert.deepEqual(await readPosts(join(directory, "posts")), []);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("new code languages and unknown fences render without a global component registry", async () => {
  const code = 'print("<tag> {value} \\\\ pipe|here")';
  for (const lang of ["python", "rust", "text", "unknown-language"]) {
    const rendered = await highlightCode(code, lang);
    assert.ok(rendered.startsWith("<Components.MarkdownPre"));
    assert.ok(rendered.includes(`raw={${JSON.stringify(code)}}`));
    assert.ok(rendered.includes("line-number"));
    assert.equal(rendered.includes("globalThis"), false);
  }
});

test("markdown table inline code preserves literal pipes", async () => {
  const compiled = await compile("| Expression |\n| --- |\n| `left\\|right` |", {
    rehypePlugins: [tableCellFormatter],
  });
  assert.ok(compiled?.code.includes("left|right"));
});
