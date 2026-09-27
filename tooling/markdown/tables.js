// mdsvex leaves escaped pipes inside inline code in GFM tables. Decode the
// escape without splitting a single code expression into multiple elements.
export const tableCellFormatter = () => /** @param {{ type: string }} tree */ (tree) => {
  /** @param {import('hast').Root | import('hast').RootContent} node */
  const visit = (node, inCell = false, inCode = false) => {
    const tag = node.type === "element" ? node.tagName : undefined;
    const cell = inCell || tag === "td" || tag === "th";
    const code = inCode || tag === "code";
    if (cell && code && node.type === "text") node.value = node.value.replace(/\\\|/g, "|");
    if ("children" in node) node.children.forEach((child) => visit(child, cell, code));
  };
  visit(/** @type {import("hast").Root} */ (tree));
};
