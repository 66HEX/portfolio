declare module "virtual:portfolio-posts" {
  const posts: Record<string, () => Promise<{ default: import("svelte").Component }>>;
  export default posts;
}
