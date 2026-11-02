import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  formatDate,
  getAllPosts,
  getPost,
  getPostSlugs,
} from '../lib/posts.ts';

const fixtures = path.join(import.meta.dirname, 'fixtures');
const postsDir = path.join(fixtures, 'posts');
const invalidDir = path.join(fixtures, 'invalid-posts');

test('finds only .mdx files and uses their names as slugs', async () => {
  assert.deepEqual(await getPostSlugs(postsDir), ['newer', 'older']);
});

test('lists posts newest first with their frontmatter', async () => {
  assert.deepEqual(await getAllPosts(postsDir), [
    {
      slug: 'newer',
      title: 'Newer post',
      date: '2026-03-01',
      description: 'The latest news.',
    },
    {
      slug: 'older',
      title: 'Older post',
      date: '2026-01-15',
      description: undefined,
    },
  ]);
});

test('renders the MDX body without the frontmatter', async () => {
  const post = await getPost('newer', postsDir);
  const html = renderToStaticMarkup(post.content);

  assert.match(html, /<h2>Section heading<\/h2>/);
  assert.match(html, /<strong>bold<\/strong>/);
  assert.match(html, /<mark>inline JSX<\/mark>/);
  assert.doesNotMatch(html, /title:/);
});

for (const [slug, field] of [
  ['missing-title', 'title'],
  ['missing-date', 'date'],
  ['bad-date', 'date'],
]) {
  test(`rejects a post with an invalid ${field} (${slug})`, async () => {
    await assert.rejects(getPost(slug, invalidDir), {
      message: new RegExp(`"${slug}" needs a "${field}"`),
    });
  });
}

test('every published post has valid frontmatter and renders', async () => {
  const posts = await getAllPosts();
  assert.ok(posts.length > 0);
  for (const { slug } of posts) {
    const html = renderToStaticMarkup((await getPost(slug)).content);
    assert.ok(html.length > 0, `${slug} rendered no content`);
  }
});

test('formats dates in UTC', () => {
  assert.equal(formatDate('2026-01-01'), 'January 1, 2026');
});
