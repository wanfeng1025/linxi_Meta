import { describe, expect, it } from 'vitest';

import { APP_ROUTES, ROUTE_MANIFEST } from '../../src/features/navigation/routes';

describe('page routes', () => {
  it('declares every page in the navigation information architecture', () => {
    expect(ROUTE_MANIFEST).toEqual(
      expect.arrayContaining([
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
      ]),
    );
  });

  it('passes stable IDs as route params instead of serialized objects', () => {
    expect(APP_ROUTES.cast('session-123')).toMatchObject({
      pathname: '/cast/[sessionId]',
      params: { sessionId: 'session-123' },
    });
    expect(JSON.stringify(APP_ROUTES.cast('session-123'))).not.toContain('lines');
  });
});
