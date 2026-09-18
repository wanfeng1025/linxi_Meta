import type { ContentDataset } from '../../scripts/content-data-schema';

const contentVersion = 'fixture-complete-v2';
const sourceId = 'fixture-source';
const sourceVersion = 'fixture-source-v2';
const rulesetId = 'fixture-ruleset';
const rulesetVersion = 'fixture-ruleset-v2';
const verifiedAt = '2026-07-20T00:00:00+08:00';
const checksum = 'f'.repeat(64);
const codes = ['000', '001', '010', '011', '100', '101', '110', '111'] as const;
const elements = [
  'fixture-wood',
  'fixture-fire',
  'fixture-earth',
  'fixture-metal',
  'fixture-water',
] as const;
const stages = [
  ['base', 6, 3, '000000'],
  ['first-change', 1, 4, '000001'],
  ['second-change', 2, 5, '000011'],
  ['third-change', 3, 6, '000111'],
  ['fourth-change', 4, 1, '001111'],
  ['fifth-change', 5, 2, '011111'],
  ['wandering-soul', 4, 1, '001111'],
  ['returning-soul', 3, 6, '000111'],
] as const;

function bits(code: string): readonly (0 | 1)[] {
  return [...code].map((value) => (value === '0' ? 0 : 1));
}

function audit<const TLayer extends 'classical' | 'professional' | 'product'>(
  layer: TLayer,
  locator: string,
): {
  readonly contentLayer: TLayer;
  readonly sourceId: string;
  readonly sourceVersion: string;
  readonly contentVersion: string;
  readonly status: 'verified';
  readonly sourceLocator: string;
  readonly originalScript: 'not-applicable';
  readonly normalizationNotes: string;
  readonly editorialChanges: string;
  readonly verifiedBy: string;
  readonly verifiedAt: string;
  readonly checksum: string;
} {
  return {
    contentLayer: layer,
    sourceId,
    sourceVersion,
    contentVersion,
    status: 'verified',
    sourceLocator: locator,
    originalScript: 'not-applicable',
    normalizationNotes: 'Synthetic fixture; no cultural text normalization.',
    editorialChanges: '',
    verifiedBy: 'automated-test-fixture-owner',
    verifiedAt,
    checksum,
  };
}

export function createCompleteFixtureDataset(): ContentDataset {
  const trigrams: ContentDataset['trigrams'] = codes.map((code, index) => ({
    id: `fixture-trigram-${code}`,
    ...audit('classical', `fixture/trigram/${code}`),
    nameSimplified: `Synthetic trigram ${code}`,
    nameTraditional: `Synthetic trigram ${code}`,
    unicodeSymbol: `fixture-trigram-symbol-${code}`,
    code,
    lineBits: bits(code) as [0 | 1, 0 | 1, 0 | 1],
    elementId: elements[index % elements.length] ?? elements[0],
    yinYangClass: index % 2 === 0 ? 'yin' : 'yang',
    familyRoleId: `fixture-family-${index + 1}`,
    laterHeavenDirectionId: `fixture-direction-${index + 1}`,
    naturalImages: [`fixture-image-${index + 1}`],
    virtues: [`fixture-virtue-${index + 1}`],
    aliases: [],
  }));

  const hexagrams: ContentDataset['hexagrams'][number][] = [];
  const hexagramLines: ContentDataset['hexagramLines'][number][] = [];
  const contentTexts: ContentDataset['contentTexts'][number][] = [];
  let sequence = 1;
  for (const upper of trigrams) {
    for (const lower of trigrams) {
      const id = `fixture-hexagram-${String(sequence).padStart(2, '0')}`;
      const code = `${lower.code}${upper.code}`;
      hexagrams.push({
        id,
        ...audit('classical', `fixture/hexagram/${sequence}`),
        kingWenSequence: sequence,
        nameSimplified: `Synthetic hexagram ${String(sequence).padStart(2, '0')}`,
        nameTraditional: `Synthetic hexagram ${String(sequence).padStart(2, '0')}`,
        unicodeSymbol: `fixture-hexagram-symbol-${String(sequence).padStart(2, '0')}`,
        aliases: [],
        upperTrigramId: upper.id,
        lowerTrigramId: lower.id,
        code,
        lineBits: bits(code) as [0 | 1, 0 | 1, 0 | 1, 0 | 1, 0 | 1, 0 | 1],
        sequenceNote: 'Synthetic ordering for tests only; not a traditional mapping.',
      });
      contentTexts.push({
        id: `${id}-judgment`,
        ...audit('classical', `fixture/hexagram/${sequence}/judgment`),
        ownerType: 'hexagram',
        ownerId: id,
        textType: 'judgment',
        textClass: 'canonical',
        locale: 'zh-Hans',
        text: `Synthetic canonical judgment ${sequence}; test-only.`,
      });
      for (const linePosition of [1, 2, 3, 4, 5, 6] as const) {
        const lineId = `${id}-line-${linePosition}`;
        const lineBit = code[linePosition - 1];
        hexagramLines.push({
          id: lineId,
          ...audit('classical', `fixture/hexagram/${sequence}/line/${linePosition}`),
          hexagramId: id,
          linePosition,
          polarity: lineBit === '1' ? 'yang' : 'yin',
          lineName: `Synthetic line ${linePosition}`,
          semanticTags: ['fixture-only'],
        });
        contentTexts.push({
          id: `${lineId}-text`,
          ...audit('classical', `fixture/hexagram/${sequence}/line/${linePosition}/text`),
          ownerType: 'hexagram-line',
          ownerId: lineId,
          textType: 'line-text',
          textClass: 'canonical',
          locale: 'zh-Hans',
          text: `Synthetic canonical line ${sequence}.${linePosition}; test-only.`,
        });
      }
      sequence += 1;
    }
  }

  const allYin = hexagrams.find((hexagram) => hexagram.code === '000000');
  const allYang = hexagrams.find((hexagram) => hexagram.code === '111111');
  if (allYin === undefined || allYang === undefined) {
    throw new Error('Synthetic fixture failed to create all-yin and all-yang hexagrams.');
  }

  const specialLineTexts: ContentDataset['specialLineTexts'] = [
    {
      id: 'fixture-use-nine',
      ...audit('classical', 'fixture/special/use-nine'),
      rulesetId,
      rulesetVersion,
      hexagramId: allYang.id,
      kind: 'use-nine',
      trigger: { type: 'all-six-lines-equal', lineValue: 9 },
    },
    {
      id: 'fixture-use-six',
      ...audit('classical', 'fixture/special/use-six'),
      rulesetId,
      rulesetVersion,
      hexagramId: allYin.id,
      kind: 'use-six',
      trigger: { type: 'all-six-lines-equal', lineValue: 6 },
    },
  ];
  for (const special of specialLineTexts) {
    contentTexts.push({
      id: `${special.id}-text`,
      ...audit('classical', `${special.sourceLocator}/text`),
      ownerType: 'special-line',
      ownerId: special.id,
      textType: 'line-text',
      textClass: 'canonical',
      locale: 'zh-Hans',
      text: `Synthetic ${special.kind} text; test-only.`,
    });
  }

  const earthlyBranches: ContentDataset['earthlyBranches'] = Array.from(
    { length: 12 },
    (_, index) => ({
      id: `fixture-branch-${index + 1}`,
      ...audit('professional', `fixture/branch/${index + 1}`),
      order: index + 1,
      nameSimplified: `Synthetic branch ${index + 1}`,
      nameTraditional: `Synthetic branch ${index + 1}`,
      elementId: elements[index % elements.length] ?? elements[0],
      yinYang: index % 2 === 0 ? 'yang' : 'yin',
    }),
  );
  const sixSpirits: ContentDataset['sixSpirits'] = Array.from({ length: 6 }, (_, index) => ({
    id: `fixture-spirit-${index + 1}`,
    ...audit('professional', `fixture/spirit/${index + 1}`),
    order: index + 1,
    nameSimplified: `Synthetic spirit ${index + 1}`,
    nameTraditional: `Synthetic spirit ${index + 1}`,
  }));

  const palaceHexagrams: ContentDataset['palaceHexagrams'] = trigrams.flatMap(
    (trigram, palaceIndex) => {
      if (trigram.elementId === null) throw new Error('Synthetic trigram requires an element.');
      const palaceElementId = trigram.elementId;
      return stages.map(([stage, shiPosition, yingPosition, transformationMask], stageIndex) => {
        const hexagram = hexagrams[palaceIndex * 8 + stageIndex];
        if (hexagram === undefined) throw new Error('Missing synthetic palace hexagram.');
        return {
          id: `fixture-palace-${palaceIndex + 1}-${stageIndex}`,
          ...audit('professional', `fixture/palace/${palaceIndex + 1}/${stage}`),
          rulesetId,
          rulesetVersion,
          palaceTrigramId: trigram.id,
          palaceElementId,
          hexagramId: hexagram.id,
          palaceSequence: stageIndex,
          stage,
          transformationMask,
          shiPosition,
          yingPosition,
        };
      });
    },
  );

  const najiaAssignments: ContentDataset['najiaAssignments'] = trigrams.flatMap(
    (trigram, trigramIndex) =>
      (['inner', 'outer'] as const).flatMap((scope, scopeIndex) =>
        ([1, 2, 3] as const).map((localLine) => {
          const branch = earthlyBranches[(trigramIndex * 6 + scopeIndex * 3 + localLine - 1) % 12];
          if (branch === undefined) throw new Error('Missing synthetic earthly branch.');
          return {
            id: `fixture-najia-${trigram.code}-${scope}-${localLine}`,
            ...audit('professional', `fixture/najia/${trigram.code}/${scope}/${localLine}`),
            rulesetId,
            rulesetVersion,
            trigramId: trigram.id,
            scope,
            localLine,
            absoluteLineHint: scope === 'inner' ? localLine : localLine + 3,
            heavenlyStemId: `fixture-stem-${((trigramIndex + scopeIndex) % 10) + 1}`,
            earthlyBranchId: branch.id,
            branchElementId: branch.elementId,
          };
        }),
      ),
  );

  const relatives = ['parent', 'sibling', 'offspring', 'wealth', 'official'] as const;
  const sixRelativeRules: ContentDataset['sixRelativeRules'] = elements.flatMap(
    (subjectElementId, subjectIndex) =>
      elements.map((objectElementId, objectIndex) => ({
        id: `fixture-relative-${subjectIndex + 1}-${objectIndex + 1}`,
        ...audit('professional', `fixture/relative/${subjectIndex + 1}/${objectIndex + 1}`),
        rulesetId,
        rulesetVersion,
        subjectElementId,
        objectElementId,
        relative: relatives[(objectIndex - subjectIndex + 5) % 5] ?? 'sibling',
        formulaCode: 'fixture-five-element-delta',
      })),
  );

  const sixSpiritRules: ContentDataset['sixSpiritRules'] = Array.from(
    { length: 10 },
    (_, index) => ({
      id: `fixture-spirit-rule-${index + 1}`,
      ...audit('professional', `fixture/six-spirit-rule/${index + 1}`),
      rulesetId,
      rulesetVersion,
      dayStemId: `fixture-stem-${index + 1}`,
      startSpiritId: sixSpirits[index % sixSpirits.length]?.id ?? 'fixture-spirit-1',
    }),
  );

  return {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    schemaId: 'https://liuyao.app/schemas/content-dataset.schema.json',
    version: {
      contentVersion,
      schemaVersion: 'content-dataset-v2',
      status: 'verified',
      completenessMode: 'complete',
      createdAt: verifiedAt,
      notes: 'Synthetic complete fixture; never production content.',
    },
    dataSources: [
      {
        sourceId,
        sourceVersion,
        title: 'Synthetic test fixture',
        authorOrEditor: 'Test suite',
        dynastyOrYear: '2026',
        edition: 'fixture-v2',
        publisherOrPlatform: 'Local test suite',
        locator: 'tests/fixtures/content-dataset.fixture.ts',
        sourceType: 'authorized-dataset',
        url: null,
        licenseStatus: 'cleared',
        publicDomainStatus: 'not-applicable',
        transcriptionStatus: 'not-applicable',
        proofreadingStatus: 'double-reviewed',
        accessedAt: null,
        reliabilityGrade: 'A',
        status: 'verified',
        verifiedBy: 'automated-test-fixture-owner',
        verifiedAt,
        notes: 'Generated facts are explicitly synthetic and test-only.',
      },
    ],
    ruleVersions: [
      {
        rulesetId,
        rulesetVersion,
        systemName: 'Synthetic test rules',
        status: 'verified',
        releaseStatus: 'released',
        parentVersion: null,
        effectiveFrom: verifiedAt,
        sourceRefs: [{ sourceId, sourceVersion }],
        scope: 'Database integration tests only.',
        changelog: 'Initial synthetic v2 rule fixture.',
        breakingChanges: [],
        sourceManifestHash: checksum,
        rulesHash: checksum,
        createdAt: verifiedAt,
        verifiedBy: 'automated-test-fixture-owner',
        verifiedAt,
        reviewedBy: 'automated-test-fixture-reviewer',
        releasedAt: verifiedAt,
        notes: 'Not a traditional ruleset.',
      },
    ],
    trigrams,
    hexagrams,
    hexagramLines,
    specialLineTexts,
    contentTexts,
    palaceHexagrams,
    earthlyBranches,
    najiaAssignments,
    sixRelativeRules,
    sixSpirits,
    sixSpiritRules,
    branchRelations: [
      {
        id: 'fixture-branch-relation',
        ...audit('professional', 'fixture/branch-relation/1'),
        rulesetId,
        rulesetVersion,
        branchIds: ['fixture-branch-1', 'fixture-branch-2'],
        relationType: 'six-harmony',
        resultElementId: null,
        directional: false,
        priority: 10,
        enabledByDefault: true,
        evidenceRequirement: 'Synthetic fixture branches must both be present.',
        notes: 'Test-only relation.',
      },
    ],
    questionCategories: [
      {
        id: 'fixture-category-general',
        ...audit('product', 'fixture/category/general'),
        parentCategoryId: null,
        label: 'Synthetic general category',
        description: 'Database fixture only.',
        requiredContextFields: [],
        usefulGodStrategy: null,
        secondaryFocus: [],
        worldResponsePolicy: null,
        allowedSubcategoryIds: [],
        disclaimerKey: null,
        sensitivityLevel: 'normal',
        rulesetId: null,
        rulesetVersion: null,
        templateGroup: 'fixture-general',
        enabled: true,
      },
    ],
    interpretationTemplates: [
      {
        id: 'fixture-template-general',
        ...audit('product', 'fixture/template/general'),
        categoryId: 'fixture-category-general',
        templateKey: 'fixture-template-key',
        templateVersion: 'fixture-template-v2',
        locale: 'zh-Hans',
        outputLevel: 'standard',
        primarySymbol: null,
        trend: null,
        rulesetId: null,
        rulesetVersion: null,
        templateText: 'Fixture summary: {{summary}}',
        variables: [{ name: 'summary', factPath: 'facts.summary' }],
        safetyTags: ['fixture-only'],
      },
    ],
    ruleDefinitions: [
      {
        id: 'fixture-rule-definition',
        ...audit('professional', 'fixture/rule/definition'),
        rulesetId,
        rulesetVersion,
        ruleType: 'fixture-rule',
        ruleKey: 'fixture-rule-key',
        priority: 1,
        inputFields: ['facts.input'],
        outputFields: ['facts.output'],
        conflictStrategy: 'fixture-no-conflict',
        description: 'Synthetic deterministic fixture rule.',
      },
    ],
  };
}
