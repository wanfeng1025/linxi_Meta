import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: '灵犀 Meta',
    short_name: '灵犀',
    description: '匿名、会话内且可复核的三币六爻结构工具。',
    start_url: '/',
    display: 'standalone',
    background_color: '#f3ead6',
    theme_color: '#173c33',
    lang: 'zh-CN',
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
    ],
  };
}
