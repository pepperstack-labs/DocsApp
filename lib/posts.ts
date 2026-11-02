import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import type { ReactElement } from 'react';
import { compileMDX } from 'next-mdx-remote/rsc';

export const POSTS_DIR = path.join(process.cwd(), 'content', 'posts');

export type PostMeta = {
  slug: string;
  title: string;
  /** ISO date (YYYY-MM-DD). */
  date: string;
  description?: string;
};

export type Post = PostMeta & { content: ReactElement };

type Frontmatter = {
  title?: unknown;
  date?: unknown;
  description?: unknown;
};

export async function getPostSlugs(dir = POSTS_DIR): Promise<string[]> {
  const files = await readdir(dir);
  return files
    .filter((file) => file.endsWith('.mdx'))
    .map((file) => file.slice(0, -'.mdx'.length))
    .sort();
}

export async function getPost(slug: string, dir = POSTS_DIR): Promise<Post> {
  const source = await readFile(path.join(dir, `${slug}.mdx`), 'utf8');
  const { content, frontmatter } = await compileMDX<Frontmatter>({
    source,
    options: { parseFrontmatter: true },
  });
  return { ...toMeta(slug, frontmatter), content };
}

/** All posts, newest first. */
export async function getAllPosts(dir = POSTS_DIR): Promise<PostMeta[]> {
  const slugs = await getPostSlugs(dir);
  const posts = await Promise.all(slugs.map((slug) => getPost(slug, dir)));
  return posts
    .map(({ content: _content, ...meta }) => meta)
    .sort(
      (a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug),
    );
}

export function formatDate(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

function toMeta(slug: string, frontmatter: Frontmatter): PostMeta {
  const { title, date, description } = frontmatter;
  if (typeof title !== 'string' || !title.trim()) {
    throw new Error(`Post "${slug}" needs a "title" in its frontmatter.`);
  }
  const isoDate = toIsoDate(date);
  if (!isoDate) {
    throw new Error(
      `Post "${slug}" needs a "date" (YYYY-MM-DD) in its frontmatter.`,
    );
  }
  if (description !== undefined && typeof description !== 'string') {
    throw new Error(`Post "${slug}" has a non-text "description".`);
  }
  return { slug, title, date: isoDate, description };
}

function toIsoDate(value: unknown): string | undefined {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return undefined;
  }
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().startsWith(value)
    ? value
    : undefined;
}
