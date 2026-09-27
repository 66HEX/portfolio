import { escapeSvelte } from "mdsvex";
import { bundledLanguages, bundledLanguagesAlias, createHighlighter } from "shiki";

const SHIKI_THEMES = {
  light: "github-light",
  dark: "github-dark",
};

/** @type {import('shiki').ShikiTransformer} */
const lineNumbers = {
  name: "line-numbers",
  code(node) {
    node.properties.style = `--line-number-width: ${String(this.lines.length).length}ch`;
  },
  line(node, line) {
    node.children.unshift({
      type: "element",
      tagName: "span",
      properties: {
        className: ["line-number"],
        "data-line": line,
        "aria-hidden": "true",
      },
      children: [],
    });
  },
};

const highlighter = await createHighlighter({
  themes: Object.values(SHIKI_THEMES),
  langs: ["svelte", "bash", "json", "typescript"],
});

/** @param {string} code @param {string} [language] */
export async function highlightCode(code, language = "text") {
  let lang = language || "text";
  if (lang !== "text" && lang !== "plaintext" && lang !== "ansi") {
    if (lang in bundledLanguages || lang in bundledLanguagesAlias) {
      await highlighter.loadLanguage(/** @type {import("shiki").BundledLanguage} */ (lang));
    } else {
      console.warn(`[markdown] Unknown code language "${lang}"; rendering as plain text.`);
      lang = "text";
    }
  }
  const render = (/** @type {string} */ theme) =>
    escapeSvelte(
      highlighter.codeToHtml(code, {
        lang,
        theme,
        tabindex: false,
        transformers: [lineNumbers],
      }),
    );
  // mdsvex imports the layout's named exports as Components for each document.
  return `<Components.MarkdownPre lang={${JSON.stringify(language)}} htmlLight={${JSON.stringify(render(SHIKI_THEMES.light))}} htmlDark={${JSON.stringify(render(SHIKI_THEMES.dark))}} raw={${JSON.stringify(code)}} />`;
}
