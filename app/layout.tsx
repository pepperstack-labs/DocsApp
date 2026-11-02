import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'DocsApp Blog', template: '%s · DocsApp Blog' },
  description: 'A simple blog written in MDX.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <Link href="/">DocsApp Blog</Link>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
