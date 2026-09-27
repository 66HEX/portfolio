import type { Root } from "hast";
import { unified } from "unified";
import { visit } from "unist-util-visit";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeRaw from "rehype-raw";
import rehypeSlug from "rehype-slug";
import rehypeSanitize from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";

function compactTableWhitespace() {
  const structuralTags = new Set(["table", "thead", "tbody", "tfoot", "tr", "colgroup"]);
  return (tree: Root) => {
    visit(tree, "element", (node) => {
      if (!structuralTags.has(node.tagName)) return;
      // rehype-raw otherwise moves GFM table formatting whitespace before the table.
      node.children = node.children.filter((child) => child.type !== "text" || !/^[\t\n\r ]*$/.test(child.value));
    });
  };
}

function absoluteUrls(baseUrl: string) {
  return (tree: Root) => {
    visit(tree, "element", (node) => {
      for (const property of ["href", "src"]) {
        const value = node.properties[property];
        if (typeof value !== "string") continue;
        try {
          node.properties[property] = new URL(value, baseUrl).href;
        } catch {
          delete node.properties[property];
        }
      }
    });
  };
}

/** Build-time HTML for readers that cannot run the site's Svelte components. */
export async function renderFeedHtml(markdown: string, articleUrl: string): Promise<string> {
  const html = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(compactTableWhitespace)
    .use(rehypeRaw)
    .use(rehypeSlug)
    .use(absoluteUrls, articleUrl)
    .use(rehypeSanitize)
    .use(rehypeStringify)
    .process(markdown);

  return String(html);
}
