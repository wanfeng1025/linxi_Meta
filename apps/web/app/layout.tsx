import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { siteUrl } from '../lib/site-url';

import './globals.css';

export const metadata: Metadata = {
  title: { default: '六爻起卦', template: '%s · 六爻起卦' },
  description: '匿名、会话内且可复核的三币六爻结构起卦工具。',
  metadataBase: siteUrl,
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>
        <header className="site-header">
          <a className="brand" href="/" aria-label="六爻起卦首页">
            六爻起卦
          </a>
          <nav aria-label="主导航">
            <a href="/casting">起卦</a>
            <a href="/hexagrams">六十四卦</a>
            <a href="/knowledge">知识</a>
            <a href="/methodology">方法与证据</a>
          </nav>
        </header>
        <main>{children}</main>
        <footer>
          仅呈现经计算的卦象结构；不提供医疗、投资或法律结论。 <a href="/disclaimer">风险说明</a>
        </footer>
      </body>
    </html>
  );
}
