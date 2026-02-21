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

<br />
<div align="center">
  <img src="./static/og-image.jpg" alt="Portfolio Template Preview" width="900" />
</div>
<br />

> [!WARNING]
> **Before publishing this template publicly**
>
> Replace all personal data from the original author (name, links, email, phone, domain, social profiles, sitemap domain, SEO identity). The main places are:
>
> - `src/lib/content/homepage-content.ts`
> - `src/lib/seo/meta.ts`

## Features

### Homepage Sections

- **Hero Banner:** Avatar + animated WebGL shader background.
- **Social Row:** Social links + theme switch (light/dark).
- **Profile Info Grid:** Location/contact details with live timezone clock.
- **GitHub Activity:** Contribution graph with API-backed data and local fallback.
- **Projects Grid:** Project cards with live/demo + optional GitHub CTA.
- **Blog Section:** Auto-list of newest published posts.
- **Testimonials Marquee:** Dual animated testimonial tracks.
- **FAQ Accordion:** Expandable question/answer cards.
- **Contact Section:** Client-side + server-side validated form with toast feedback.
- **Footer:** Social links + copyright line.

### Blog Engine

- **File-based blog content:** `src/routes/blog/<slug>/+page.svx`.
- **Typed frontmatter schema:** validated via `content-collections` + `zod`.
- **Custom markdown component system:** headings, lists, tables, callouts, code blocks, step blocks.
- **Code blocks with copy action:** integrated copy-to-clipboard button.
- **Article SEO support:** canonical, OG/Twitter tags, JSON-LD `BlogPosting`.

### API & Backend Logic

- **Contact API (`/api/contact`):**
  - zod validation
  - honeypot anti-spam field
  - IP-based rate limiting
  - Resend integration for transactional email delivery
- **GitHub API (`/api/github-contributions`):**
  - token-aware GraphQL fetch
  - in-memory cache + in-flight dedupe
  - timeout-guarded network requests
- **Sitemap route (`/sitemap.xml`)** generated from published posts.

## Technical Stack

### Core

- **Framework:** SvelteKit 2
- **UI Runtime:** Svelte 5 (Runes API)
- **Language:** TypeScript (strict)
- **Build Tool:** Vite 7

### Styling & UI

- **Tailwind CSS v4**
- **Design utilities:** `clsx`, `tailwind-merge`, `class-variance-authority`
- **Icons:** `lucide-svelte` + custom social icons
- **Toast notifications:** `varsel`

### Content & Markdown

- **mdsvex** (`.svx` routes)
- **content-collections** (typed content indexing)
- **shiki** (syntax highlighting pipeline)

### Graphics

- **three.js** + **@threlte/core** for the animated hero shader scene

### Deployment

- **Adapter:** `@sveltejs/adapter-cloudflare`
- **Runtime target:** Cloudflare Workers (`wrangler`)

## Visual Direction

This template follows a compact neumorphism/skeuomorphism visual language with:

- OKLCH-based color tokens for light and dark themes
- soft raised/inset surfaces (`card-highlight`, `input-highlight`, `btn-primary`, `btn-secondary`)
- layered borders, highlights, and shadow stacks to simulate depth
- animated background noise and shader-based hero texture for material feel

All global visual tokens and effects are defined in:

- `src/routes/layout.css`

## Content Management

### 1. Homepage Content (single source of truth)

Edit:

- `src/lib/content/homepage-content.ts`

This file controls:

- hero image and alt
- name, role, social links
- profile facts
- projects
- testimonials
- FAQ
- contact section copy
- footer copy

### 2. Blog Content

Create a new folder and post file:

- `src/routes/blog/my-new-post/+page.svx`

Required frontmatter fields:

```yaml
---
title: "Post title"
description: "Short summary"
date: "2026-02-21"
tags:
  - sveltekit
  - frontend
thumbnail: "/images/works/example.webp"
published: true
layout: docs
---
```

### 3. SEO Identity

Update:

- `src/lib/seo/meta.ts`

You should replace:

- `siteName`
- `siteUrl`
- `twitterHandle`
- default OG image + alt
- JSON-LD identity links (`sameAs`)

## Environment Variables

Create `.env.local` from `.env.example`:

```bash
cp .env.example .env.local
```

Available variables:

- `GITHUB_TOKEN` (optional, enables live GitHub contribution data)
- `RESEND_API_KEY` (required for contact form email sending)
- `CONTACT_FROM_EMAIL` (optional override)
- `CONTACT_TO_EMAIL`

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

## License

MIT License. See [LICENSE](LICENSE) for details.
