import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { parse } from "yaml";
import { postMetadataSchema, postSlugSchema } from "../src/lib/features/blog/schema.ts";

export async function readPosts(directory: string) {
  const files = await readdir(directory, { recursive: true, withFileTypes: true }).catch(
    (error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") return [];
      throw error;
    },
  );
  return Promise.all(
    files
      .filter((file) => file.isFile() && file.name.endsWith(".svx"))
      .map(async (file) => {
        const path = join(file.parentPath, file.name);
        const slug = relative(directory, path)
          .replaceAll("\\", "/")
          .replace(/\.svx$/, "");
        const source = await readFile(path, "utf8");
        const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(source);
        if (!frontmatter) throw new Error(`${path}: start the post with YAML frontmatter between --- lines.`);
        try {
          return { ...postMetadataSchema.parse(parse(frontmatter[1])), slug: postSlugSchema.parse(slug), path };
        } catch (error) {
          throw new Error(`${path}: ${error instanceof Error ? error.message : String(error)}`, { cause: error });
        }
      }),
  );
}
