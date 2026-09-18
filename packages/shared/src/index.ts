export interface UnavailableCapability {
  readonly available: false;
  readonly code:
    'INTERPRETATION_RULES_UNAVAILABLE' | 'PROFESSIONAL_RULES_UNAVAILABLE' | 'AI_DISABLED';
  readonly message: string;
}

export const unavailableCapabilities = {
  interpretation: {
    available: false,
    code: 'INTERPRETATION_RULES_UNAVAILABLE',
    message: '经核验的解卦规则尚未发布。',
  },
  professional: {
    available: false,
    code: 'PROFESSIONAL_RULES_UNAVAILABLE',
    message: '专业六爻规则尚未通过人工复核。',
  },
  ai: {
    available: false,
    code: 'AI_DISABLED',
    message: 'AI 解读在当前版本中未启用。',
  },
} as const satisfies Record<string, UnavailableCapability>;
