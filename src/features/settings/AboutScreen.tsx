import { Text } from 'react-native';

import { Card, Screen, TaijiMark } from '@/shared/components';
import { useAppTheme } from '@/shared/theme/AppThemeProvider';

export function AboutScreen() {
  const theme = useAppTheme();
  return (
    <Screen title="关于与风险声明" subtitle="一款离线优先、规则可追溯的文化学习工具。">
      <TaijiMark size={112} />
      {[
        [
          '用途边界',
          '本应用用于《周易》文化学习和个人反思，不承诺预测准确性，不替代医疗、法律、财务或其他专业意见。',
        ],
        [
          '隐私政策摘要',
          '问题、铜钱原值和历史默认只保存在本机 SQLite。未提交问题不自动保存，不写入日志；当前没有云同步或 AI 上传。',
        ],
        [
          '用户协议摘要',
          '请勿把结果用于伤害自己或他人、博彩、欺诈或规避专业责任。遇到健康危机、人身危险或法律紧急情况，请联系当地专业服务。',
        ],
        [
          '规则透明',
          '随机起卦、卦象映射和解释分层。AI、动画、摇动力度或页面文案都不得改写确定性事实。',
        ],
        [
          '专业能力状态',
          '专业六爻生产规则和历法尚未完成来源、授权、双人复核与金标准，因此当前不会展示真实专业排盘。',
        ],
      ].map(([title, body]) => (
        <Card key={title}>
          <Text
            accessibilityRole="header"
            style={[theme.typography.heading, { color: theme.colors.ink }]}
          >
            {title}
          </Text>
          <Text style={[theme.typography.body, { color: theme.colors.muted }]}>{body}</Text>
        </Card>
      ))}
    </Screen>
  );
}
