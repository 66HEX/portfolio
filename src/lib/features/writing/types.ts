export type WritingPost = {
  title: string;
  description: string;
  date: string;
  href: string;
} & ({ kind: "local" } | { kind: "external"; source: string });
