import type { MetadataRoute } from 'next';

import { siteUrl } from '../lib/site-url';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    '',
    '/casting',
    '/hexagrams',
    '/knowledge',
    '/methodology',
    '/privacy',
    '/terms',
    '/disclaimer',
  ].map((path) => ({ url: new URL(path, siteUrl).toString(), lastModified: new Date() }));
}
