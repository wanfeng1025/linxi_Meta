import type { MetadataRoute } from 'next';
import { verifiedHexagrams } from '@liuyao/content';

import { siteUrl } from '../lib/site-url';

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages = [
    '',
    '/casting',
    '/hexagrams',
    '/knowledge',
    '/methodology',
    '/privacy',
    '/terms',
    '/disclaimer',
  ].map((path) => ({
    url: new URL(path, siteUrl).toString(),
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
  }));
  const hexagramPages = verifiedHexagrams.map((hexagram) => ({
    url: new URL(`/hexagrams/${hexagram.id}`, siteUrl).toString(),
    lastModified: new Date(),
    changeFrequency: 'yearly' as const,
  }));

  return [...staticPages, ...hexagramPages];
}
