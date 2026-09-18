import { useLocalSearchParams } from 'expo-router';
import { Text } from 'react-native';

import { useAppRuntime } from '@/features/app/AppRuntimeProvider';
import { Card, Screen, StateView, Tag } from '@/shared/components';
import { useAppTheme } from '@/shared/theme/AppThemeProvider';

export function KnowledgeDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const theme = useAppTheme();
  const item = useAppRuntime().getKnowledge(slug);
  if (item === null)
    return (
      <Screen>
        <StateView kind="error" title="知识条目不存在" message="该稳定 ID 未出现在当前内容版本。" />
      </Screen>
    );
  return (
    <Screen
      title={item.title}
      subtitle={
        item.status === 'verified'
          ? '以下仅展示通过数据门禁的结构事实。'
          : '该主题尚未完成来源与规则审核。'
      }
    >
      <Text
        accessibilityElementsHidden
        style={{ fontSize: 88, textAlign: 'center', color: theme.colors.ink }}
      >
        {item.symbol}
      </Text>
      <Tag
        label={item.status === 'verified' ? '已核验' : '待审核'}
        tone={item.status === 'verified' ? 'success' : 'warning'}
      />
      <Card>
        <Text style={[theme.typography.body, { color: theme.colors.ink }]}>{item.summary}</Text>
      </Card>
      {item.facts.length > 0 ? (
        item.facts.map((fact) => (
          <Card key={fact}>
            <Text style={[theme.typography.body, { color: theme.colors.muted }]}>{fact}</Text>
          </Card>
        ))
      ) : (
        <StateView
          kind="empty"
          title="暂无可发布正文"
          message="未确认内容不会作为权威结论进入产品查询。"
        />
      )}
      {item.contentVersion && (
        <Text style={[theme.typography.caption, { color: theme.colors.subtle }]}>
          内容版本：{item.contentVersion}
        </Text>
      )}
    </Screen>
  );
}
