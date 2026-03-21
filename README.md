<div align="center">
  <h1>SvelteKit Portfolio Template</h1>
</div>

<div align="center">
  <img src="https://img.shields.io/badge/SvelteKit-v2-ff3e00?style=flat-square&logo=svelte" alt="SvelteKit" />
  <img src="https://img.shields.io/badge/Svelte-v5-red?style=flat-square&logo=svelte" alt="Svelte" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-v4-38bdf8?style=flat-square&logo=tailwindcss" alt="Tailwind" />
  <img src="https://img.shields.io/badge/TypeScript-5.9.3-blue?style=flat-square&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Cloudflare-Workers-f38020?style=flat-square&logo=cloudflare" alt="Cloudflare" />
  <img src="https://img.shields.io/badge/license-MIT-lightgrey?style=flat-square" alt="License" />
</div>

**SvelteKit Portfolio Template** is a production-oriented personal website starter focused on a polished visual system, content-driven homepage sections, markdown-powered blog posts, and server features required in real portfolio workflows (contact form, SEO metadata, sitemap, GitHub activity integration).

> [!WARNING]
> **Before publishing this template publicly**
>
> Replace all personal data from the original author (name, links, email, phone, domain, social profiles, SEO identity, sample content). Main places to update:
>
> - `src/lib/content/data/` (individual section files)
> - `src/routes/blog/` (sample posts)
> - `resume.tex` and `static/resume.pdf` (if you keep resume links)
>
> Quick audit command:
>
> - `rg -n "Marek|66HEX|madebyhex" src static resume.tex`

## Features

### Homepage Sections

- **Hero Banner:** Avatar + optimized Ventura wallpaper background.
- **Social Row:** Social links.
- **About Section:** Structured narrative blocks with optional nested highlights.
- **GitHub Activity:** Contribution graph with API-backed data and local fallback.
- **Projects Grid:** Project cards with live/demo + optional GitHub CTA.
- **Blog Section:** Auto-list of newest published posts.
- **Testimonials Marquee:** Dual animated testimonial tracks.
- **Contact Section:** Client-side + server-side validated form with toast feedback.
- **Footer:** Social links + copyright line.

### Blog Engine

- **File-based blog content:** `src/routes/blog/<slug>/+page.svx`.
- **Typed frontmatter schema:** validated via `content-collections` + `zod`.
- **Custom markdown component system:** headings, lists, tables, callouts, code blocks, step blocks.
- **Code blocks with copy action:** integrated copy-to-clipboard button.
- **Article SEO support:** canonical, OG/Twitter tags, JSON-LD `BlogPosting`.
- **Dynamic OG image endpoint:** `/blog/og/<slug>` rendered via Satori + Resvg.
- **Raw markdown endpoint:** `/blog/raw/<slug>` for LLM/crawler-friendly source content.

### API & Backend Logic

- **Contact API (`/api/contact`):**
  - zod validation
  - Cloudflare Turnstile token verification
  - honeypot anti-spam field
  - IP-based rate limiting
  - Resend integration for transactional email delivery
- **GitHub API (`/api/github-contributions`):**
  - token-aware GraphQL fetch
  - in-memory cache + in-flight dedupe
  - timeout-guarded network requests
- **Sitemap route (`/sitemap.xml`)** generated from published posts.
- **Robots route (`/robots.txt`)** generated dynamically from `siteUrl`.
- **LLMs route (`/llms.txt`)** with grouped links to `/blog/raw/<slug>`.

## Technical Stack

### Core

- **Framework:** SvelteKit 2
- **UI Runtime:** Svelte 5 (Runes API)
- **Language:** TypeScript (strict)
- **Build Tool:** Vite 7

### Styling & UI

- **Tailwind CSS v4**
- **Design utilities:** `clsx`, `tailwind-merge`, `class-variance-authority`
- **Icons:** `carbon`
- **Toast notifications:** `varsel`

### Content & Markdown

- **mdsvex** (`.svx` routes)
- **content-collections** (typed content indexing)
- **shiki** (syntax highlighting pipeline)
- **satori + @resvg/resvg-wasm** (dynamic Open Graph image rendering)

### Deployment

- **Adapter:** `@sveltejs/adapter-cloudflare`
- **Runtime target:** Cloudflare Workers (`wrangler`)

## Content Management

### 1. Homepage Content

The homepage content is modularized for better maintainability. You can find all data files in `src/lib/content/data/`:

- `site.ts`: Global config (site name, URL, SEO keywords).
- `hero.ts`: Hero section data and profile facts.
- `socials.ts`: Social media links used across the site.
- `about.ts`: Narrative and highlights about you.
- `github.ts`: GitHub activity card text + GitHub username used by API fetch.
- `projects.ts`: Your featured works.
- `testimonials.ts`: Client/colleague feedback.
- `blog.ts`: Blog section labels.
- `contact.ts`: Contact form copy.
- `footer.ts`: Footer specific links and copyright.

All these are aggregated and exported from `src/lib/content/homepage-content.ts`.

### 2. Blog Content

Create a new folder and post file:

- `src/routes/blog/my-new-post/+page.svx`

Recommended frontmatter fields:

```yaml
---
title: "Post title"
description: "Short summary"
date: "2026-02-21"
tags:
  - sveltekit
  - frontend
published: true
---
```

Notes:

- `title`, `description`, `date`, `tags`, and `published` are the core metadata used by blog lists, SEO, and sitemap.
- `layout: docs` is optional. Blog posts use the docs layout by default.

### 3. GitHub Identity

Update `src/lib/content/data/github.ts`:

- `githubCard.username` (used by `/api/github-contributions` and homepage graph)

### 4. SEO Identity

Update `src/lib/content/data/site.ts` to replace:

- `siteName`
- `siteUrl`
- `twitterHandle`
- default OG image + alt
- JSON-LD identity links (`sameAsLinks`)

## Environment Variables

Create `.env.local` from `.env.example`:

```bash
cp .env.example .env.local
```

Available variables:

- `GITHUB_TOKEN` (optional, enables live GitHub contribution data)
- `RESEND_API_KEY` (required for contact form email sending)
- `CONTACT_FROM_EMAIL` (optional override)
- `CONTACT_TO_EMAIL` (required recipient mailbox)
- `PUBLIC_TURNSTILE_SITE_KEY` (required for client widget)
- `TURNSTILE_SECRET_KEY` (required for server-side token verification)

Turnstile setup:

- Create a Turnstile widget in **Managed** mode.
- Use its Site Key as `PUBLIC_TURNSTILE_SITE_KEY` and Secret Key as `TURNSTILE_SECRET_KEY`.
- Keep Turnstile action configured as `contact_form`.

### Production (Cloudflare Workers)

Before first deploy, authenticate Wrangler and set Worker environment values in Cloudflare:

```bash
bunx wrangler login
bunx wrangler secret put RESEND_API_KEY
bunx wrangler secret put CONTACT_TO_EMAIL
bunx wrangler secret put CONTACT_FROM_EMAIL
bunx wrangler secret put TURNSTILE_SECRET_KEY
bunx wrangler secret put GITHUB_TOKEN
```

`PUBLIC_TURNSTILE_SITE_KEY` can be set in Cloudflare Dashboard as a regular variable for the Worker.

## Installation

### Prerequisites

- **Bun** (recommended)
- or a Node.js environment capable of running this SvelteKit setup

### Setup

```bash
git clone https://github.com/66HEX/portfolio
cd portfolio
bun install
cp .env.example .env.local
```

### Run locally

```bash
bun run dev
```

### Quality checks

```bash
bun run check
bun run lint
bun run format:check
```

## Build & Deploy

### Build

```bash
bun run build
```

### Local worker preview

```bash
bun run preview
```

### Deploy to Cloudflare

```bash
bun run deploy
```

Cloudflare configuration lives in:

- `wrangler.jsonc`
- Worker runtime env should contain the variables listed in **Environment Variables**.

## License

MIT License. See [LICENSE](LICENSE) for details.
