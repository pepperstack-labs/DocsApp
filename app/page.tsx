import Link from 'next/link';
import { formatDate, getAllPosts } from '@/lib/posts';

export default async function HomePage() {
  const posts = await getAllPosts();

  return (
    <>
      <h1>Posts</h1>
      <ul className="post-list">
        {posts.map((post) => (
          <li key={post.slug}>
            <Link href={`/posts/${post.slug}`}>{post.title}</Link>
            <time dateTime={post.date}>{formatDate(post.date)}</time>
            {post.description && <p>{post.description}</p>}
          </li>
        ))}
      </ul>
    </>
  );
}
