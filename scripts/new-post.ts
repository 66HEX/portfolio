import { mkdir, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { parseArgs } from "node:util";
import { pathToFileURL } from "node:url";
import { postMetadataSchema, postSlugSchema } from "../src/lib/features/blog/schema.ts";

export function slugify(title: string): string {
  return title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replaceAll("ł", "l")
    .replaceAll("Ł", "L")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function createPost(
  directory: string,
  title: string,
  slug = slugify(title),
  date = new Date().toISOString().slice(0, 10),
) {
  const safeSlug = postSlugSchema.parse(slug);
  const metadata = postMetadataSchema.parse({
    title,
    description: "Add a short description for the article preview and search results.",
    date,
    tags: [],
    published: false,
  });
  const path = resolve(directory, `${safeSlug}.svx`);
  await mkdir(dirname(path), { recursive: true });
  const source = `---\ntitle: ${JSON.stringify(metadata.title)}\ndescription: ${JSON.stringify(metadata.description)}\ndate: ${JSON.stringify(metadata.date)}\ntags: []\npublished: false\n---\n\n## Start here\n\nWrite your article here. The page title comes from frontmatter.\n`;
  await writeFile(path, source, { flag: "wx" });
  return { path, slug: safeSlug };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const { values, positionals } = parseArgs({
      allowPositionals: true,
      options: {
        slug: { type: "string" },
        date: { type: "string" },
        help: { type: "boolean" },
      },
    });
    if (values.help) {
      console.log('pnpm post:new "Article title" [--slug custom-slug] [--date YYYY-MM-DD]');
    } else {
      if (!positionals.length) throw new Error('Provide a title: pnpm post:new "Article title"');
      const post = await createPost(resolve("src/portfolio/posts"), positionals.join(" "), values.slug, values.date);
      console.log(
        `Created draft: ${post.path}\nPreview with pnpm dev at /blog/${post.slug}\nSet published: true when ready.`,
      );
    }
  } catch (error) {
    console.error(
      error instanceof Error && "code" in error && error.code === "EEXIST"
        ? "This post already exists. Choose another slug; no file was overwritten."
        : error instanceof Error
          ? error.message
          : error,
    );
    process.exitCode = 1;
  }
}
