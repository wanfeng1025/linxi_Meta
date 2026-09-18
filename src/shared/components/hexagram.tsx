import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { CastLine, LinePosition, Polarity } from '@/domain/casting';
import { useAppTheme } from '@/shared/theme/AppThemeProvider';

import { Card, Tag } from './primitives';

const POSITION_LABELS: Readonly<Record<LinePosition, string>> = {
  1: '初爻',
  2: '二爻',
  3: '三爻',
  4: '四爻',
  5: '五爻',
  6: '上爻',
};

export function HexagramLine({
  polarity,
  moving = false,
  position,
  compact = false,
}: {
  polarity: Polarity;
  moving?: boolean;
  position?: LinePosition;
  compact?: boolean;
}) {
  const theme = useAppTheme();
  const height = compact ? 7 : 10;
  const label = `${position === undefined ? '' : POSITION_LABELS[position]}${polarity === 'yang' ? '阳爻' : '阴爻'}${moving ? '，动爻' : ''}`;
  return (
    <View accessibilityLabel={label} style={styles.lineRow}>
      {position !== undefined && (
        <Text style={[theme.typography.caption, styles.position, { color: theme.colors.subtle }]}>
          {POSITION_LABELS[position]}
        </Text>
      )}
      <View style={styles.lineGraphic}>
        {polarity === 'yang' ? (
          <View style={[styles.yang, { height, backgroundColor: theme.colors.ink }]} />
        ) : (
          <View style={styles.yinRow}>
            <View style={[styles.yin, { height, backgroundColor: theme.colors.ink }]} />
            <View style={[styles.yin, { height, backgroundColor: theme.colors.ink }]} />
          </View>
        )}
      </View>
      <View style={styles.movingSlot}>
        {moving && (
          <View
            accessibilityLabel="动爻标识"
            style={[styles.moving, { borderColor: theme.colors.accent }]}
          />
        )}
      </View>
    </View>
  );
}

export function CastLines({ lines }: { lines: readonly CastLine[] }) {
  return (
    <View accessibilityLabel="六爻图，从上爻到初爻显示" style={styles.lines}>
      {[...lines].reverse().map((line) => (
        <HexagramLine
          key={line.position}
          position={line.position}
          polarity={line.polarity}
          moving={line.movement === 'moving'}
        />
      ))}
    </View>
  );
}

export function HexagramCard({
  symbol,
  name,
  sequence,
  code,
  label,
}: {
  symbol: string;
  name: string;
  sequence: number;
  code: string;
  label: string;
}) {
  const theme = useAppTheme();
  return (
    <Card accessibilityLabel={`${label}：第${sequence}卦${name}`} style={styles.hexagramCard}>
      <Tag label={label} tone="accent" />
      <Text style={[styles.hexagramSymbol, { color: theme.colors.ink }]}>{symbol}</Text>
      <Text
        accessibilityRole="header"
        style={[theme.typography.heading, { color: theme.colors.ink }]}
      >
        第 {sequence} 卦 · {name}
      </Text>
      <Text style={[theme.typography.caption, { color: theme.colors.subtle }]}>
        结构码 {code} · 初爻在左
      </Text>
    </Card>
  );
}

export function EvidenceCard({
  title,
  detail,
  source,
}: {
  title: string;
  detail: string;
  source: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const theme = useAppTheme();
  return (
    <Card>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={`${title}，${expanded ? '收起' : '展开'}判断依据`}
        onPress={() => setExpanded((value) => !value)}
        style={styles.evidenceHeader}
      >
        <Text style={[theme.typography.label, { color: theme.colors.ink }]}>{title}</Text>
        <Text style={{ color: theme.colors.accent }}>{expanded ? '收起 −' : '展开 ＋'}</Text>
      </Pressable>
      {expanded && (
        <View style={styles.evidenceBody}>
          <Text style={[theme.typography.body, { color: theme.colors.muted }]}>{detail}</Text>
          <Text style={[theme.typography.caption, { color: theme.colors.subtle }]}>
            版本依据：{source}
          </Text>
        </View>
      )}
    </Card>
  );
}

export function TaijiMark({ size = 88 }: { size?: number }) {
  const theme = useAppTheme();
  return (
    <View
      accessibilityLabel="太极图形装饰"
      accessibilityElementsHidden
      style={[
        styles.taiji,
        { width: size, height: size, borderRadius: size / 2, borderColor: theme.colors.goldSoft },
      ]}
    >
      <Text
        style={[
          styles.taijiText,
          { color: theme.colors.ink, fontSize: size * 0.82, lineHeight: size },
        ]}
      >
        ☯
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  lineRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 30 },
  position: { width: 38, textAlign: 'right' },
  lineGraphic: { width: 132 },
  yang: { width: '100%', borderRadius: 2 },
  yinRow: { width: '100%', flexDirection: 'row', justifyContent: 'space-between' },
  yin: { width: '43%', borderRadius: 2 },
  movingSlot: { width: 16, alignItems: 'center' },
  moving: { width: 11, height: 11, borderRadius: 6, borderWidth: 2 },
  lines: { gap: 7, alignItems: 'center', paddingVertical: 8 },
  hexagramCard: { flex: 1, minWidth: 150, alignItems: 'center' },
  hexagramSymbol: { fontSize: 58, lineHeight: 66 },
  evidenceHeader: {
    minHeight: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  evidenceBody: { gap: 8 },
  taiji: { alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  taijiText: { textAlign: 'center' },
});
