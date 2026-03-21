export const docsUiConfig = {
  search: {
    enabled: true,
    triggerPlaceholder: "Search articles...",
    dialogPlaceholder: "Search titles, headings, and content...",
    noResultsLabel: "No results found.",
    submitHintLabel: "Open selected result",
    hotkey: {
      enabled: true,
      key: "k",
      metaOrCtrl: true,
      label: "⌘ K",
    },
  },
} as const;
