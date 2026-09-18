import { describe, expect, it } from 'vitest';

import { validateContentDataset } from '../../scripts/content-data-schema';
import { createCompleteFixtureDataset } from '../fixtures/content-dataset.fixture';

describe('content dataset schema and business validation', () => {
  it('accepts a complete synthetic fixture with explicit 8/64/384 coverage', () => {
    const result = validateContentDataset(createCompleteFixtureDataset(), {
      environment: 'fixture',
    });

    expect(result.report.valid).toBe(true);
    expect(result.report.counts).toMatchObject({
      trigrams: 8,
      hexagrams: 64,
      hexagramLines: 384,
      specialLineTexts: 2,
      palaceHexagrams: 64,
      najiaAssignments: 48,
      sixRelativeRules: 25,
      sixSpirits: 6,
      sixSpiritRules: 10,
      earthlyBranches: 12,
      draftRecords: 0,
    });
  });

  it('rejects a complete dataset without use-nine or use-six', () => {
    const dataset = createCompleteFixtureDataset();
    const result = validateContentDataset(
      { ...dataset, specialLineTexts: dataset.specialLineTexts.slice(0, 1) },
      { environment: 'fixture' },
    );

    expect(result.report.valid).toBe(false);
    expect(result.report.issues.some((issue) => issue.code.startsWith('MISSING_USE_'))).toBe(true);
  });

  it('rejects undefined template variables and missing source references', () => {
    const dataset = createCompleteFixtureDataset();
    const template = dataset.interpretationTemplates[0];
    const trigram = dataset.trigrams[0];
    expect(template).toBeDefined();
    expect(trigram).toBeDefined();
    if (template === undefined || trigram === undefined) return;

    const result = validateContentDataset(
      {
        ...dataset,
        trigrams: [{ ...trigram, sourceId: 'missing-source' }, ...dataset.trigrams.slice(1)],
        interpretationTemplates: [{ ...template, templateText: 'Undefined: {{missingValue}}' }],
      },
      { environment: 'fixture' },
    );

    expect(result.report.missingSourceRefs).toContain('missing-source@fixture-source-v2');
    expect(result.report.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(['MISSING_SOURCE', 'UNDEFINED_TEMPLATE_VARIABLE']),
    );
  });

  it('rejects draft versions and records in a production import', () => {
    const dataset = createCompleteFixtureDataset();
    const category = dataset.questionCategories[0];
    expect(category).toBeDefined();
    if (category === undefined) return;

    const result = validateContentDataset(
      {
        ...dataset,
        version: { ...dataset.version, status: 'draft' },
        questionCategories: [{ ...category, status: 'draft' }],
      },
      { environment: 'production' },
    );

    expect(result.report.valid).toBe(false);
    expect(result.report.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(['PRODUCTION_VERSION_NOT_VERIFIED', 'DRAFT_IN_PRODUCTION']),
    );
  });

  it('rejects inconsistent palace stages, line polarity, and incomplete professional data', () => {
    const dataset = createCompleteFixtureDataset();
    const palace = dataset.palaceHexagrams[0];
    const line = dataset.hexagramLines[0];
    expect(palace).toBeDefined();
    expect(line).toBeDefined();
    if (palace === undefined || line === undefined) return;

    const result = validateContentDataset(
      {
        ...dataset,
        palaceHexagrams: [{ ...palace, shiPosition: 1 }, ...dataset.palaceHexagrams.slice(1)],
        hexagramLines: [
          { ...line, polarity: line.polarity === 'yin' ? 'yang' : 'yin' },
          ...dataset.hexagramLines.slice(1),
        ],
        najiaAssignments: dataset.najiaAssignments.slice(0, 47),
      },
      { environment: 'fixture' },
    );

    expect(result.report.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        'PALACE_STAGE_POSITION_MISMATCH',
        'LINE_POLARITY_MISMATCH',
        'NAJIA_COUNT',
      ]),
    );
  });

  it('requires per-record verification audit metadata', () => {
    const dataset = createCompleteFixtureDataset();
    const trigram = dataset.trigrams[0];
    expect(trigram).toBeDefined();
    if (trigram === undefined) return;

    const result = validateContentDataset(
      {
        ...dataset,
        trigrams: [{ ...trigram, checksum: null }, ...dataset.trigrams.slice(1)],
      },
      { environment: 'fixture' },
    );

    expect(result.dataset).toBeNull();
    expect(result.report.issues.some((issue) => issue.phase === 'schema')).toBe(true);
  });

  it('requires all canonical judgments and line texts in complete mode', () => {
    const dataset = createCompleteFixtureDataset();
    const removed = dataset.contentTexts.find((text) => text.textType === 'line-text');
    expect(removed).toBeDefined();
    if (removed === undefined) return;

    const result = validateContentDataset(
      {
        ...dataset,
        contentTexts: dataset.contentTexts.filter((text) => text.id !== removed.id),
      },
      { environment: 'fixture' },
    );

    expect(result.report.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(['MISSING_LINE_TEXT']),
    );
  });

  it('rejects placeholder text in production', () => {
    const dataset = createCompleteFixtureDataset();
    const category = dataset.questionCategories[0];
    expect(category).toBeDefined();
    if (category === undefined) return;

    const result = validateContentDataset(
      {
        ...dataset,
        questionCategories: [{ ...category, description: '待补充' }],
      },
      { environment: 'production' },
    );

    expect(result.report.issues.map((issue) => issue.code)).toContain(
      'PRODUCTION_PLACEHOLDER_TEXT',
    );
  });

  it('runs schema validation before business validation', () => {
    const result = validateContentDataset(
      { version: { contentVersion: 'latest' } },
      {
        environment: 'fixture',
      },
    );

    expect(result.dataset).toBeNull();
    expect(result.report.counts.totalContentRecords).toBe(0);
    expect(result.report.issues.every((issue) => issue.phase === 'schema')).toBe(true);
  });
});
