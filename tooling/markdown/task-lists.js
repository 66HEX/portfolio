export const taskListFormatter = () => (tree) => {
  const visit = (node) => {
    if (node.type === "element" && node.tagName === "li" && node.properties?.className?.includes("task-list-item")) {
      const firstContent = node.children.find((child) => child.type === "element");
      const container = firstContent?.tagName === "p" ? firstContent : node;
      const checkboxIndex = container.children.findIndex(
        (child) => child.type === "element" && child.tagName === "input" && child.properties?.type === "checkbox",
      );

      if (checkboxIndex !== -1) {
        const [checkbox] = container.children.splice(checkboxIndex, 1);
        node.properties["data-task-checked"] = String(Boolean(checkbox.properties.checked));
        const followingText = container.children[checkboxIndex];
        if (followingText?.type === "text") {
          followingText.value = followingText.value.replace(/^ /, "");
        }
      }
    }

    node.children?.forEach(visit);
  };

  visit(tree);
};
