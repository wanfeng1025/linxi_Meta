import type { Href } from 'expo-router';

export const APP_ROUTES = Object.freeze({
  home: '/' as Href,
  question: '/question' as Href,
  resume: '/resume' as Href,
  cast: (sessionId: string): Href =>
    ({ pathname: '/cast/[sessionId]', params: { sessionId } }) as unknown as Href,
  result: (sessionId: string): Href =>
    ({ pathname: '/result/[sessionId]', params: { sessionId } }) as unknown as Href,
  professional: (sessionId: string): Href =>
    ({ pathname: '/professional/[sessionId]', params: { sessionId } }) as unknown as Href,
  interpretation: (sessionId: string): Href =>
    ({ pathname: '/interpretation/[sessionId]', params: { sessionId } }) as unknown as Href,
  history: '/history' as Href,
  historyDetail: (sessionId: string): Href =>
    ({ pathname: '/history/[sessionId]', params: { sessionId } }) as unknown as Href,
  knowledge: '/knowledge' as Href,
  knowledgeDetail: (slug: string): Href =>
    ({ pathname: '/knowledge/[slug]', params: { slug } }) as unknown as Href,
  settings: '/settings' as Href,
  deviceDiagnostics: '/device-diagnostics' as Href,
  about: '/about' as Href,
});

export const ROUTE_MANIFEST = Object.freeze([
  '/',
  '/question',
  '/resume',
  '/cast/[sessionId]',
  '/result/[sessionId]',
  '/professional/[sessionId]',
  '/interpretation/[sessionId]',
  '/history',
  '/history/[sessionId]',
  '/knowledge',
  '/knowledge/[slug]',
  '/settings',
  '/device-diagnostics',
  '/about',
] as const);
