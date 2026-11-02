import type { Metadata } from 'next';
import { formatDate, getPost, getPostSlugs } from '@/lib/posts';

type Props = { params: Promise<{ slug: string }> };

// Only the posts found at build time exist.
export const dynamicParams = false;

export async function generateStaticParams() {
  const slugs = await getPostSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  return { title: post.title, description: post.description };
}

export default async function PostPage({ params }: Props) {
  const { slug } = await params;
  const post = await getPost(slug);

  return (
    <article>
      <h1>{post.title}</h1>
      <time dateTime={post.date}>{formatDate(post.date)}</time>
      <div className="post-body">{post.content}</div>
    </article>
  );
}
