import { describe, expect, it } from 'vitest';

import {
  NOTES_MAX_LENGTH,
  QUESTION_MAX_LENGTH,
  isHighRiskCategory,
  validateQuestionForm,
  type QuestionFormValues,
} from '../../src/application/page';

function form(patch: Partial<QuestionFormValues> = {}): QuestionFormValues {
  return {
    question: '未来一个月如何调整项目节奏？',
    category: 'career',
    timeHorizon: 'within-month',
    askingFor: 'self',
    mode: 'simple',
    method: 'tap',
    notes: '',
    ...patch,
  };
}

describe('page question form', () => {
  it('accepts a complete local-only question form', () => {
    expect(validateQuestionForm(form())).toEqual({ success: true, data: form() });
  });

  it('rejects blank and overlong content with field errors', () => {
    const blank = validateQuestionForm(form({ question: '   ' }));
    const long = validateQuestionForm(
      form({
        question: '问'.repeat(QUESTION_MAX_LENGTH + 1),
        notes: '注'.repeat(NOTES_MAX_LENGTH + 1),
      }),
    );
    expect(blank).toMatchObject({ success: false, errors: { question: expect.any(String) } });
    expect(long).toMatchObject({
      success: false,
      errors: { question: expect.any(String), notes: expect.any(String) },
    });
  });

  it('flags health, financial, and legal categories for dedicated warnings', () => {
    expect(isHighRiskCategory('health')).toBe(true);
    expect(isHighRiskCategory('investment')).toBe(true);
    expect(isHighRiskCategory('legal')).toBe(true);
    expect(isHighRiskCategory('study')).toBe(false);
  });
});
