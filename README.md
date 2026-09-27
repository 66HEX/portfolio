# SvelteKit portfolio

A personal portfolio with a configurable homepage, local Markdown articles, external publications, a GitHub contribution graph and a contact form. Built with Svelte 5, SvelteKit, shadcn-svelte (Mira), Tailwind CSS and Cloudflare Workers.

## Start locally

Use Node **22.18+** and the pnpm version pinned in `package.json`.

```sh
pnpm install
cp .env.example .env.local
pnpm setup:check
pnpm dev
```

The site runs without service credentials. Live GitHub data needs a token; sending contact messages needs Resend and Turnstile. `pnpm setup:check` reports missing variables without displaying their values. Remove an integration's section from the configuration if you do not need it.

## Make it yours

Everything you edit to personalize the portfolio lives in [`src/portfolio/`](src/portfolio/). `src/lib/` holds the implementation.

Start with [`src/portfolio/config.ts`](src/portfolio/config.ts). It contains the owner's name, role, domain, social accounts, language, homepage section order, Writing limit and hero shader settings.

Then edit the section text and items in [`src/portfolio/sections/`](src/portfolio/sections/). Replace the avatar, experience logos, favicon, résumé and OG logo. Personal project descriptions, posts and testimonials are examples from the original portfolio; they are not generated from the owner's name.

| Task                                           | Where                           |
| ---------------------------------------------- | ------------------------------- |
| Identity, domain, section order and visibility | `src/portfolio/config.ts`       |
| About, experience, projects and interface copy | `src/portfolio/sections/`       |
| Local articles                                 | `src/portfolio/posts/**/*.svx`  |
| External publications and service names        | `src/portfolio/publications.ts` |
| Colors, spacing and typography tokens          | `src/routes/layout.css`         |
| Font files and HTML preload                    | `static/fonts/`, `src/app.html` |
| Deployment name and domains                    | `wrangler.jsonc`                |

## Write a post

```sh
pnpm post:new "My first article"
pnpm dev
```

This creates `src/portfolio/posts/my-first-article.svx` as a draft. Preview it at `/blog/my-first-article`; set `published: true` when ready. Existing files are never overwritten. No route, import or sitemap registration is needed.

[Writing guide](docs/writing.md): frontmatter, code languages, images, tables, custom Svelte components, external articles and publishing.

## Commands

| Command                             | Purpose                                                   |
| ----------------------------------- | --------------------------------------------------------- |
| `pnpm dev`                          | Validate content and start the development server         |
| `pnpm post:new "Title"`             | Create a draft; supports `--slug` and `--date`            |
| `pnpm config:check`                 | Validate settings, posts and external publications        |
| `pnpm setup:check`                  | Validate content and report local integration setup       |
| `pnpm tweets:sync`                  | Explicitly refresh the testimonial cache from X           |
| `pnpm check`                        | Validate content and check Svelte/TypeScript              |
| `pnpm lint`                         | Check source with ESLint                                  |
| `pnpm test`                         | Run content, configuration and authoring regression tests |
| `pnpm format` / `pnpm format:check` | Format or check formatting                                |
| `pnpm verify`                       | Run checks, lint, tests and production build              |
| `pnpm build`                        | Build the Cloudflare Worker and static assets             |
| `pnpm preview`                      | Run the built Worker locally                              |
| `pnpm deploy`                       | Deploy the built output with Wrangler                     |

Builds use the committed testimonial cache and do not fetch X. Refresh it deliberately and commit the result with content changes; failed requests keep the previous cached entries.

## Deploy

1. Set `portfolio.url`, then change the worker name and custom domains in `wrangler.jsonc`.
2. Run `pnpm verify`.
3. Configure the required Cloudflare environment variables and secrets described in [configuration](docs/configuration.md#integrations-and-secrets).
4. Run `pnpm deploy`.

`wrangler.jsonc` currently targets the original author's domains. Change or remove its `routes` before deploying your own copy. This template targets a site hosted at the domain root; a nonempty SvelteKit `paths.base` needs a separate audit of static and API URLs.

## Maintenance

Generated shadcn components live in `src/lib/components/ui/`; add components with `pnpm exec shadcn-svelte add <component>`. Feature-specific code lives in `src/lib/features/`. `.content-collections/` and `.svelte-kit/` are generated and should not be edited or committed.

UI icons use Nucleo UI Outline 18 and Nucleo Social Media. Add SVG definitions to [`src/lib/components/icons/data.ts`](src/lib/components/icons/data.ts), include the exact Nucleo source filename or library name in a comment, and render them with `IconRenderer.svelte`. When adding or regenerating a shadcn component, replace its generated icon imports with these shared definitions.

The [Mona Sans](https://github.com/github/mona-sans) font files include their SIL Open Font License in `static/fonts/MonaSans-LICENSE.txt`.

MIT License. See [LICENSE](LICENSE).
