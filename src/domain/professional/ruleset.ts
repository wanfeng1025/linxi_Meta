import { ProfessionalDomainError } from './errors';
import type { ProfessionalRuleset, ProfessionalRulesetInput, VersionedRule } from './types';

function fail(message: string): never {
  throw new ProfessionalDomainError('INVALID_RULESET', message);
}

function assertNonEmpty(value: string, field: string): void {
  if (value.trim().length === 0) fail(`${field} must be a non-empty string.`);
}

function assertImmutableVersion(value: string, field: string): void {
  assertNonEmpty(value, field);
  if (value === 'latest') fail(`${field} must be immutable and cannot be "latest".`);
}

function assertUnique<T>(values: readonly T[], key: (value: T) => string, label: string): void {
  const seen = new Set<string>();
  for (const value of values) {
    const itemKey = key(value);
    if (seen.has(itemKey)) fail(`${label} contains duplicate key ${itemKey}.`);
    seen.add(itemKey);
  }
}

function allRules(input: ProfessionalRulesetInput): readonly VersionedRule[] {
  return [
    ...input.palaceRules,
    ...input.najiaRules,
    ...input.earthlyBranches,
    ...input.sixRelativeRules,
    ...input.sixSpirits,
    ...input.sixSpiritStartRules,
    ...input.voidRules,
    ...input.branchRelationRules,
    ...input.usefulGodRules,
    ...input.supportingRoleRules,
    ...input.hiddenSpiritRules,
  ];
}

function validateCommon(input: ProfessionalRulesetInput): void {
  const { metadata } = input;
  assertNonEmpty(metadata.rulesetId, 'metadata.rulesetId');
  assertImmutableVersion(metadata.rulesetVersion, 'metadata.rulesetVersion');
  assertImmutableVersion(metadata.contentVersion, 'metadata.contentVersion');
  assertImmutableVersion(metadata.calendarAlgorithmVersion, 'metadata.calendarAlgorithmVersion');
  assertImmutableVersion(metadata.timezoneDataVersion, 'metadata.timezoneDataVersion');
  assertNonEmpty(metadata.compatibilityGroup, 'metadata.compatibilityGroup');

  if (metadata.trueSolarTimeEnabled !== (metadata.dayBoundaryPolicy === 'true-solar-zi-hour')) {
    fail('trueSolarTimeEnabled and dayBoundaryPolicy must describe the same calendar policy.');
  }

  assertUnique(allRules(input), (rule) => rule.ruleId, 'rules');
  for (const rule of allRules(input)) {
    if (
      rule.rulesetId !== metadata.rulesetId ||
      rule.rulesetVersion !== metadata.rulesetVersion ||
      rule.contentVersion !== metadata.contentVersion
    ) {
      throw new ProfessionalDomainError(
        'MIXED_RULESET',
        `Rule ${rule.ruleId} does not belong to the metadata ruleset and content version.`,
      );
    }
    assertNonEmpty(rule.sourceId, `${rule.ruleId}.sourceId`);
    assertImmutableVersion(rule.sourceVersion, `${rule.ruleId}.sourceVersion`);
    assertNonEmpty(rule.sourceLocator, `${rule.ruleId}.sourceLocator`);
  }

  const manifestSourceIds = new Set(
    metadata.sources.map((source) => `${source.sourceId}|${source.sourceVersion}`),
  );
  for (const rule of allRules(input)) {
    if (!manifestSourceIds.has(`${rule.sourceId}|${rule.sourceVersion}`)) {
      fail(
        `Rule ${rule.ruleId} references source ${rule.sourceId}@${rule.sourceVersion} outside the source manifest.`,
      );
    }
  }

  assertUnique(input.palaceRules, (rule) => rule.hexagramId, 'palaceRules');
  assertUnique(
    input.najiaRules,
    (rule) => `${rule.trigramId}|${rule.scope}|${rule.localLine}`,
    'najiaRules',
  );
  assertUnique(input.earthlyBranches, (rule) => rule.branchId, 'earthlyBranches');
  assertUnique(input.earthlyBranches, (rule) => String(rule.order), 'earthlyBranches.order');
  assertUnique(
    input.sixRelativeRules,
    (rule) => `${rule.palaceElementId}|${rule.lineElementId}`,
    'sixRelativeRules',
  );
  assertUnique(input.sixSpirits, (rule) => rule.spiritId, 'sixSpirits');
  assertUnique(input.sixSpirits, (rule) => String(rule.order), 'sixSpirits.order');
  assertUnique(input.sixSpiritStartRules, (rule) => rule.dayStemId, 'sixSpiritStartRules');
  assertUnique(input.voidRules, (rule) => String(rule.cycleStartIndex), 'voidRules');
  assertUnique(input.supportingRoleRules, (rule) => rule.usefulGodRelative, 'supportingRoleRules');
  assertUnique(
    input.hiddenSpiritRules,
    (rule) => `${rule.hexagramId}|${rule.linePosition}|${rule.hiddenRelative}`,
    'hiddenSpiritRules',
  );

  const branchIds = new Set(input.earthlyBranches.map((rule) => rule.branchId));
  for (const rule of input.najiaRules) {
    if (!branchIds.has(rule.earthlyBranchId)) {
      fail(`Najia rule ${rule.ruleId} references unknown branch ${rule.earthlyBranchId}.`);
    }
  }
  for (const rule of input.voidRules) {
    if (rule.voidBranches.some((branch) => !branchIds.has(branch))) {
      fail(`Void rule ${rule.ruleId} references an unknown branch.`);
    }
  }
  for (const rule of input.branchRelationRules) {
    if (rule.branchIds.length < 2 || rule.branchIds.some((branch) => !branchIds.has(branch))) {
      fail(`Branch relation ${rule.ruleId} must reference at least two known branches.`);
    }
  }
  const spiritIds = new Set(input.sixSpirits.map((rule) => rule.spiritId));
  for (const rule of input.sixSpiritStartRules) {
    if (!spiritIds.has(rule.startSpiritId)) {
      fail(`Six-spirit rule ${rule.ruleId} references unknown spirit ${rule.startSpiritId}.`);
    }
  }
}

function validateProductionCompleteness(input: ProfessionalRulesetInput): void {
  const { metadata } = input;
  if (metadata.verificationStatus !== 'production_verified') {
    throw new ProfessionalDomainError(
      'UNVERIFIED_RULESET',
      'Production rulesets must be explicitly verified.',
    );
  }
  if (
    metadata.sourceManifestHash === null ||
    metadata.rulesHash === null ||
    metadata.verifiedAt === null ||
    metadata.verifiedBy.length < 2 ||
    metadata.sources.length === 0 ||
    metadata.sources.some((source) => source.verificationStatus !== 'production_verified')
  ) {
    throw new ProfessionalDomainError(
      'UNVERIFIED_RULESET',
      'Production rulesets require hashes, two reviewers, a verification time, and verified sources.',
    );
  }
  if (
    !/^[a-fA-F0-9]{64}$/.test(metadata.sourceManifestHash) ||
    !/^[a-fA-F0-9]{64}$/.test(metadata.rulesHash) ||
    new Set(metadata.verifiedBy).size < 2
  ) {
    throw new ProfessionalDomainError(
      'UNVERIFIED_RULESET',
      'Production rulesets require SHA-256 hashes and two distinct reviewers.',
    );
  }

  const requiredCounts: readonly [string, number, number][] = [
    ['palaceRules', input.palaceRules.length, 64],
    ['najiaRules', input.najiaRules.length, 48],
    ['earthlyBranches', input.earthlyBranches.length, 12],
    ['sixRelativeRules', input.sixRelativeRules.length, 25],
    ['sixSpirits', input.sixSpirits.length, 6],
    ['sixSpiritStartRules', input.sixSpiritStartRules.length, 10],
    ['voidRules', input.voidRules.length, 6],
    ['supportingRoleRules', input.supportingRoleRules.length, 5],
  ];
  for (const [label, actual, expected] of requiredCounts) {
    if (actual !== expected) fail(`A complete production ruleset requires ${expected} ${label}.`);
  }
  if (input.usefulGodRules.length === 0) fail('A production ruleset requires useful-god rules.');
  if (input.branchRelationRules.length === 0) {
    fail('A production ruleset requires explicit branch-relation rules.');
  }
  if (input.hiddenSpiritRules.length === 0) {
    fail('A production ruleset requires explicit hidden/flying-spirit rules.');
  }

  const palaceGroups = new Map<string, Set<number>>();
  for (const rule of input.palaceRules) {
    const sequences = palaceGroups.get(rule.palaceTrigramId) ?? new Set<number>();
    sequences.add(rule.palaceSequence);
    palaceGroups.set(rule.palaceTrigramId, sequences);
    if (Math.abs(rule.worldPosition - rule.responsePosition) !== 3) {
      fail(`Palace rule ${rule.ruleId} has illegal world/response positions.`);
    }
  }
  if (
    palaceGroups.size !== 8 ||
    [...palaceGroups.values()].some(
      (sequences) => sequences.size !== 8 || [...sequences].some((value) => value < 0 || value > 7),
    )
  ) {
    fail('A production ruleset requires eight complete palace sequences 0..7.');
  }

  const najiaGroups = new Map<string, Set<number>>();
  for (const rule of input.najiaRules) {
    const key = `${rule.trigramId}|${rule.scope}`;
    const positions = najiaGroups.get(key) ?? new Set<number>();
    positions.add(rule.localLine);
    najiaGroups.set(key, positions);
  }
  if (
    najiaGroups.size !== 16 ||
    [...najiaGroups.values()].some((positions) => positions.size !== 3)
  ) {
    fail('A production ruleset requires inner and outer 1..3 Najia coverage for eight trigrams.');
  }

  const palaceElements = new Set(input.sixRelativeRules.map((rule) => rule.palaceElementId));
  const lineElements = new Set(input.sixRelativeRules.map((rule) => rule.lineElementId));
  if (palaceElements.size !== 5 || lineElements.size !== 5) {
    fail('A production ruleset requires a complete five-by-five six-relative matrix.');
  }
}

function freezeList<T extends object>(values: readonly T[]): readonly Readonly<T>[] {
  return Object.freeze(values.map((value) => Object.freeze({ ...value })));
}

function freezeRuleset(input: ProfessionalRulesetInput): ProfessionalRuleset {
  const voidRules = Object.freeze(
    input.voidRules.map((rule) =>
      Object.freeze({ ...rule, voidBranches: Object.freeze([...rule.voidBranches]) }),
    ),
  );
  const branchRelationRules = Object.freeze(
    input.branchRelationRules.map((rule) =>
      Object.freeze({ ...rule, branchIds: Object.freeze([...rule.branchIds]) }),
    ),
  );
  const usefulGodRules = Object.freeze(
    input.usefulGodRules.map((rule) =>
      Object.freeze({
        ...rule,
        match: Object.freeze({
          ...rule.match,
          questionCategories: Object.freeze([...rule.match.questionCategories]),
          questionSubcategories: Object.freeze([...rule.match.questionSubcategories]),
          selfOrProxy: Object.freeze([...rule.match.selfOrProxy]),
          subjectRoles: Object.freeze([...rule.match.subjectRoles]),
          targetRoles: Object.freeze([...rule.match.targetRoles]),
          targetRelationships: Object.freeze([...rule.match.targetRelationships]),
          desiredOutcomes: Object.freeze([...rule.match.desiredOutcomes]),
          requiredContextTags: Object.freeze([...rule.match.requiredContextTags]),
        }),
      }),
    ),
  );
  return Object.freeze({
    metadata: Object.freeze({
      ...input.metadata,
      verifiedBy: Object.freeze([...input.metadata.verifiedBy]),
      sources: freezeList(input.metadata.sources),
    }),
    palaceRules: freezeList(input.palaceRules),
    najiaRules: freezeList(input.najiaRules),
    earthlyBranches: freezeList(input.earthlyBranches),
    sixRelativeRules: freezeList(input.sixRelativeRules),
    sixSpirits: freezeList(input.sixSpirits),
    sixSpiritStartRules: freezeList(input.sixSpiritStartRules),
    voidRules,
    branchRelationRules,
    usefulGodRules,
    supportingRoleRules: freezeList(input.supportingRoleRules),
    hiddenSpiritRules: freezeList(input.hiddenSpiritRules),
  }) as ProfessionalRuleset;
}

export function createProfessionalRuleset(input: ProfessionalRulesetInput): ProfessionalRuleset {
  validateCommon(input);
  validateProductionCompleteness(input);
  return freezeRuleset(input);
}

/** Test-only escape hatch for small, synthetic fixtures. Never use this in product composition. */
export function createTestProfessionalRuleset(
  input: ProfessionalRulesetInput,
): ProfessionalRuleset {
  validateCommon(input);
  if (input.metadata.verificationStatus !== 'test-only') {
    fail('createTestProfessionalRuleset only accepts explicitly test-only metadata.');
  }
  return freezeRuleset(input);
}

/**
 * Candidate data may be loaded in staging and candidate test suites only.
 * It intentionally does not satisfy the production constructor.
 */
export function createCandidateProfessionalRuleset(
  input: ProfessionalRulesetInput,
): ProfessionalRuleset {
  validateCommon(input);
  if (input.metadata.verificationStatus !== 'production_candidate') {
    fail('createCandidateProfessionalRuleset only accepts production_candidate metadata.');
  }
  return freezeRuleset(input);
}
