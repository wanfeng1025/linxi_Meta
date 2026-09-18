import { z } from 'zod';

import { QUESTION_CATEGORIES, type QuestionFormValues } from './types';

export const QUESTION_MAX_LENGTH = 240;
export const NOTES_MAX_LENGTH = 500;

export const questionFormSchema = z.object({
  question: z
    .string()
    .trim()
    .min(1, '请输入一个明确的问题')
    .max(QUESTION_MAX_LENGTH, `问题不能超过 ${QUESTION_MAX_LENGTH} 个字符`),
  category: z.enum(QUESTION_CATEGORIES),
  timeHorizon: z.enum(['within-week', 'within-month', 'within-year', 'open-ended']),
  askingFor: z.enum(['self', 'other']),
  mode: z.enum(['simple', 'professional']),
  method: z.enum(['tap', 'shake']),
  notes: z.string().trim().max(NOTES_MAX_LENGTH, `备注不能超过 ${NOTES_MAX_LENGTH} 个字符`),
});

export type QuestionFormErrors = Partial<Record<keyof QuestionFormValues, string>>;

export function validateQuestionForm(value: QuestionFormValues):
  | { readonly success: true; readonly data: QuestionFormValues }
  | {
      readonly success: false;
      readonly errors: QuestionFormErrors;
    } {
  const result = questionFormSchema.safeParse(value);
  if (result.success) return { success: true, data: result.data };
  const errors: QuestionFormErrors = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0];
    if (typeof field === 'string' && !(field in errors)) {
      errors[field as keyof QuestionFormValues] = issue.message;
    }
  }
  return { success: false, errors };
}

export function isHighRiskCategory(category: QuestionFormValues['category']): boolean {
  return ['health', 'investment', 'wealth', 'dispute', 'legal'].includes(category);
}
