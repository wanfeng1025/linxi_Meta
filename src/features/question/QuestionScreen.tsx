import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import {
  NOTES_MAX_LENGTH,
  QUESTION_MAX_LENGTH,
  isHighRiskCategory,
  type QuestionFormErrors,
  type QuestionFormValues,
  validateQuestionForm,
} from '@/application/page';
import { useAppRuntime } from '@/features/app/AppRuntimeProvider';
import { APP_ROUTES } from '@/features/navigation/routes';
import { Button, Card, OfflineBanner, Screen, Tag } from '@/shared/components';
import { useAppTheme } from '@/shared/theme/AppThemeProvider';

const CATEGORY_OPTIONS = [
  ['general-decision', '综合'],
  ['career', '事业'],
  ['study', '学习'],
  ['relationship', '关系'],
  ['travel', '出行'],
  ['health', '健康'],
  ['investment', '投资'],
  ['legal', '法律'],
] as const;

const HORIZON_OPTIONS = [
  ['within-week', '一周内'],
  ['within-month', '一月内'],
  ['within-year', '一年内'],
  ['open-ended', '开放时间'],
] as const;

function ChoiceRow<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly (readonly [T, string])[];
  onChange: (value: T) => void;
}) {
  const theme = useAppTheme();
  return (
    <View style={styles.field}>
      <Text style={[theme.typography.label, { color: theme.colors.ink }]}>{label}</Text>
      <View accessibilityRole="radiogroup" style={styles.choices}>
        {options.map(([id, optionLabel]) => {
          const selected = id === value;
          return (
            <Pressable
              key={id}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              onPress={() => onChange(id)}
              style={[
                styles.choice,
                {
                  borderColor: selected ? theme.colors.accent : theme.colors.border,
                  backgroundColor: selected ? theme.colors.accentSoft : theme.colors.surfaceRaised,
                },
              ]}
            >
              <Text
                style={[
                  theme.typography.label,
                  { color: selected ? theme.colors.accent : theme.colors.ink },
                ]}
              >
                {optionLabel}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function QuestionScreen() {
  const runtime = useAppRuntime();
  const theme = useAppTheme();
  const [values, setValues] = useState<QuestionFormValues>({
    question: '',
    category: 'general-decision',
    timeHorizon: 'within-month',
    askingFor: 'self',
    mode: runtime.preferences.defaultMode,
    method: 'tap',
    notes: '',
  });
  const [errors, setErrors] = useState<QuestionFormErrors>({});
  const highRisk = useMemo(() => isHighRiskCategory(values.category), [values.category]);

  const update = <K extends keyof QuestionFormValues>(key: K, value: QuestionFormValues[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const submit = async () => {
    const result = validateQuestionForm(values);
    if (!result.success) {
      setErrors(result.errors);
      return;
    }
    try {
      const session = await runtime.start(result.data);
      router.replace(APP_ROUTES.cast(session.sessionId));
    } catch {
      // Runtime exposes a readable error state without logging the question text.
    }
  };

  if (runtime.activeSession !== null) {
    return (
      <Screen title="已有未完成起卦" subtitle="每次只保留一个草稿会话，避免原始铜钱串到另一问题。">
        <Card>
          <Text style={[theme.typography.body, { color: theme.colors.muted }]}>
            {runtime.activeMetadata?.values.question ?? '问题摘要不可用'}
          </Text>
          <Button label="继续当前起卦" onPress={() => router.replace(APP_ROUTES.resume)} />
          <Button label="返回首页" tone="ghost" onPress={() => router.replace(APP_ROUTES.home)} />
        </Card>
      </Screen>
    );
  }

  return (
    <Screen title="记录这一问" subtitle="问题不会在输入过程中自动保存；提交后仅保存在本机。">
      <OfflineBanner />
      <View style={styles.field}>
        <View style={styles.labelRow}>
          <Text style={[theme.typography.label, { color: theme.colors.ink }]}>问题内容</Text>
          <Text style={[theme.typography.caption, { color: theme.colors.subtle }]}>
            {values.question.length}/{QUESTION_MAX_LENGTH}
          </Text>
        </View>
        <TextInput
          accessibilityLabel="问题内容"
          accessibilityHint="请输入希望反思的明确问题"
          multiline
          maxLength={QUESTION_MAX_LENGTH}
          value={values.question}
          onChangeText={(text) => update('question', text)}
          placeholder="例如：未来一个月，我应如何调整项目推进节奏？"
          placeholderTextColor={theme.colors.subtle}
          style={[
            styles.input,
            styles.questionInput,
            theme.typography.body,
            {
              color: theme.colors.ink,
              borderColor: errors.question ? theme.colors.danger : theme.colors.border,
              backgroundColor: theme.colors.surfaceRaised,
            },
          ]}
        />
        {errors.question && (
          <Text
            accessibilityRole="alert"
            style={[theme.typography.caption, { color: theme.colors.danger }]}
          >
            {errors.question}
          </Text>
        )}
      </View>

      <ChoiceRow
        label="问题分类"
        value={values.category}
        options={CATEGORY_OPTIONS}
        onChange={(value) => update('category', value)}
      />
      <Text style={[theme.typography.caption, { color: theme.colors.muted }]}>
        分类只筛选未来解释，不影响随机结果和卦象计算。
      </Text>
      {highRisk && (
        <Card style={{ backgroundColor: theme.colors.warningSoft }}>
          <Text style={[theme.typography.label, { color: theme.colors.warning }]}>
            专项风险提示
          </Text>
          <Text style={[theme.typography.body, { color: theme.colors.ink }]}>
            健康、投资和法律相关结果只能用于整理思路，请同时咨询有资质的专业人士；本应用不提供诊断、收益保证或法律结论。
          </Text>
        </Card>
      )}

      <ChoiceRow
        label="时间范围"
        value={values.timeHorizon}
        options={HORIZON_OPTIONS}
        onChange={(value) => update('timeHorizon', value)}
      />
      <ChoiceRow
        label="询问对象"
        value={values.askingFor}
        options={[
          ['self', '自问'],
          ['other', '代问'],
        ]}
        onChange={(value) => update('askingFor', value)}
      />
      <ChoiceRow
        label="起卦模式"
        value={values.mode}
        options={[
          ['simple', '简易'],
          ['professional', '专业'],
        ]}
        onChange={(value) => update('mode', value)}
      />
      {values.mode === 'professional' && (
        <Card>
          <Tag label="专业规则未发布" tone="warning" />
          <Text style={[theme.typography.body, { color: theme.colors.muted }]}>
            仍可完成基础起卦；专业排盘会明确显示审核缺口，不展示伪造字段。
          </Text>
        </Card>
      )}

      <View style={styles.field}>
        <Text style={[theme.typography.label, { color: theme.colors.ink }]}>起卦方式</Text>
        <View style={styles.choices}>
          <Pressable
            accessibilityRole="radio"
            accessibilityState={{ checked: true }}
            style={[
              styles.choice,
              { borderColor: theme.colors.accent, backgroundColor: theme.colors.accentSoft },
            ]}
          >
            <Text style={[theme.typography.label, { color: theme.colors.accent }]}>点击起爻</Text>
          </Pressable>
          <View
            accessibilityLabel="摇一摇可在设置中开启，按钮起爻始终可用"
            style={[styles.choice, { borderColor: theme.colors.border, opacity: 0.55 }]}
          >
            <Text style={[theme.typography.label, { color: theme.colors.muted }]}>
              摇一摇 · 在设置中开启
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.field}>
        <View style={styles.labelRow}>
          <Text style={[theme.typography.label, { color: theme.colors.ink }]}>可选备注</Text>
          <Text style={[theme.typography.caption, { color: theme.colors.subtle }]}>
            {values.notes.length}/{NOTES_MAX_LENGTH}
          </Text>
        </View>
        <TextInput
          accessibilityLabel="可选备注"
          multiline
          maxLength={NOTES_MAX_LENGTH}
          value={values.notes}
          onChangeText={(text) => update('notes', text)}
          placeholder="只记录有助于未来回看的背景，避免填写身份证、账号等敏感信息"
          placeholderTextColor={theme.colors.subtle}
          style={[
            styles.input,
            theme.typography.body,
            {
              color: theme.colors.ink,
              borderColor: errors.notes ? theme.colors.danger : theme.colors.border,
              backgroundColor: theme.colors.surfaceRaised,
            },
          ]}
        />
      </View>

      {runtime.actionError && (
        <Text
          accessibilityRole="alert"
          style={[theme.typography.body, { color: theme.colors.danger }]}
        >
          {runtime.actionError}
        </Text>
      )}
      <Button label="确认并进入起卦" busy={runtime.actionBusy} onPress={() => void submit()} />
      <Text
        accessibilityLabel="隐私说明"
        style={[theme.typography.caption, { color: theme.colors.subtle }]}
      >
        隐私说明：未提交内容只存在于当前页面内存；提交后问题、原始铜钱与快照写入本机
        SQLite，不上传网络。
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  field: { gap: 8 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  input: { minHeight: 92, borderWidth: 1, borderRadius: 14, padding: 14, textAlignVertical: 'top' },
  questionInput: { minHeight: 120 },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choice: {
    minHeight: 42,
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: 999,
  },
});
