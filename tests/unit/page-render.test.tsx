import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { describe, expect, it, vi } from 'vitest';

import { createCastingSession } from '../../src/domain/casting';
import { HomeView } from '../../src/features/home/HomeScreen';
import { AppThemeProvider } from '../../src/shared/theme/AppThemeProvider';

vi.mock('expo-router', () => ({ router: { push: vi.fn() } }));
vi.mock('@/features/app/AppRuntimeProvider', () => ({ useAppRuntime: vi.fn() }));
vi.mock('react-native', () => ({
  ActivityIndicator: 'ActivityIndicator',
  Modal: 'Modal',
  Pressable: 'Pressable',
  ScrollView: 'ScrollView',
  Text: 'Text',
  View: 'View',
  StyleSheet: { create: <Value,>(value: Value) => value, hairlineWidth: 1 },
  useColorScheme: () => 'light',
  useWindowDimensions: () => ({ width: 390, height: 844, scale: 1, fontScale: 1 }),
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

function render(active = false): ReactTestRenderer {
  const session = active
    ? createCastingSession({
        sessionId: 'render-session',
        method: 'tap',
        inputSchemaVersion: 'input-v1',
        rulesetVersion: 'rules-v1',
        randomAlgorithmVersion: 'random-v1',
        createdAt: '2026-07-20T00:00:00.000Z',
      })
    : null;
  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(
      <AppThemeProvider preference="light" fontSize="standard">
        <HomeView
          activeSession={session}
          activeMetadata={
            active
              ? {
                  schemaVersion: 'page-cast-metadata-v1',
                  sessionId: 'render-session',
                  submittedAt: '2026-07-20T00:00:00.000Z',
                  timezone: 'Asia/Shanghai',
                  values: {
                    question: '恢复测试问题',
                    category: 'study',
                    timeHorizon: 'within-month',
                    askingFor: 'self',
                    mode: 'simple',
                    method: 'tap',
                    notes: '',
                  },
                }
              : null
          }
          recentHistory={[]}
          onStart={vi.fn()}
          onContinue={vi.fn()}
          onHistory={vi.fn()}
          onKnowledge={vi.fn()}
        />
      </AppThemeProvider>,
    );
  });
  return tree;
}

describe('home page rendering and accessibility', () => {
  it('renders empty, offline, risk, and accessible start states', () => {
    const tree = render(false);
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain('暂无历史');
    expect(json).toContain('离线可用');
    expect(json).toContain('仅供文化学习');
    expect(
      tree.root.findAll((node) => node.props.accessibilityLabel === '开始新的起卦').length,
    ).toBeGreaterThan(0);
    expect(
      tree.root.findAll((node) => node.props.accessibilityLabel === '离线状态：核心功能可用')
        .length,
    ).toBeGreaterThan(0);
  });

  it('renders a recoverable draft with progress and question summary', () => {
    const json = JSON.stringify(render(true).toJSON());
    expect(json).toContain('继续未完成起卦');
    expect(json).toContain('恢复测试问题');
    expect(json).toContain('0/6 爻');
  });
});
