import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { AmbientScene } from '../components/ambient-scene';
import { BrandMark } from '../components/brand-mark';
import { siteUrl } from '../lib/site-url';

import './globals.css';

export const metadata: Metadata = {
  applicationName: '灵犀 Meta',
  title: { default: '灵犀 Meta｜匿名、可复核的三币起卦', template: '%s｜灵犀 Meta' },
  description: '匿名、会话内且可复核的三币六爻结构工具；保留原始铜钱与规则版本。',
  metadataBase: siteUrl,
  alternates: { canonical: '/' },
  icons: { icon: '/icon.svg', shortcut: '/icon.svg', apple: '/icon.svg' },
  manifest: '/manifest.webmanifest',
  openGraph: {
    type: 'website',
    locale: 'zh_CN',
    url: '/',
    siteName: '灵犀 Meta',
    title: '灵犀 Meta｜匿名、可复核的三币起卦',
    description: '以三枚铜钱记录一卦，保留原始值、动爻、本卦、变卦与版本证据。',
    images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: '灵犀 Meta' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '灵犀 Meta｜匿名、可复核的三币起卦',
    description: '以三枚铜钱记录一卦，保留原始值与版本证据。',
    images: ['/opengraph-image'],
  },
  robots: { index: true, follow: true },
  category: 'culture',
};

const structuredData = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: '灵犀 Meta',
  applicationCategory: 'LifestyleApplication',
  operatingSystem: 'Web',
  url: siteUrl.toString(),
  description: '匿名、会话内且可复核的三币六爻结构工具。',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'CNY' },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>
        <a className="skip-link" href="#main-content">
          跳到主要内容
        </a>
        <AmbientScene />
        <header className="site-header">
          <a className="brand" href="/" aria-label="灵犀 Meta 首页">
            <BrandMark className="brand-logo" />
            <span>
              <strong>灵犀</strong>
              <small>Meta</small>
            </span>
          </a>
          <nav aria-label="主导航">
            <a href="/casting">起卦</a>
            <a href="/hexagrams">六十四卦</a>
            <a href="/knowledge">知识</a>
            <a href="/methodology">方法与证据</a>
          </nav>
        </header>
        <main id="main-content">{children}</main>
        <footer>
          <span>灵犀 Meta 仅呈现可复核的卦象结构，不提供医疗、投资或法律结论。</span>
          <span className="footer-links">
            <a href="/privacy">隐私</a>
            <a href="/terms">条款</a>
            <a href="/disclaimer">风险说明</a>
          </span>
        </footer>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </body>
    </html>
  );
}
