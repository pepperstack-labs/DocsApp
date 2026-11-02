# DocsApp Blog

A simple blog built with the **Next.js App Router** and **MDX**. Every page is generated at build time and exported as static HTML; there is no server, database or API.

## Run locally

Requires Node.js 22.18+ (Node 24 recommended) and npm.

```sh
npm ci
npm run dev
```

Open **http://localhost:3000**. The dev server reloads when you edit a post.

## Add a post

Create an `.mdx` file in `content/posts/`. The file name becomes the URL, so `content/posts/my-new-post.mdx` is published at `/posts/my-new-post`.

Start the file with frontmatter:

```mdx
---
title: My new post
date: 2026-11-02
description: Optional one-line summary shown on the index page.
---

Write the post in Markdown. JSX such as <mark>this</mark> works too.
```

`title` and `date` (`YYYY-MM-DD`) are required; the build fails with a clear message if either is missing or invalid. The index page lists posts newest first.

## Build

```sh
npm run build
```

This writes the static site to `out/`: `index.html` plus one page per post under `out/posts/`. Host that folder on any static file server or CDN. To preview it locally, serve the folder, for example with `npx serve out`.

## Checks

```sh
npm run format:check
npm run typecheck
npm test
npm run build
```

`npm test` uses Node's built-in test runner to check post loading, frontmatter validation, newest-first ordering and MDX rendering, including every post in `content/posts/`. CI runs the same checks.
