import authorizedDataset from '../../../data/source/interpretations/hexagram-line-explanations-authorized-v1.json';

export interface AuthorizedInterpretation {
  readonly id: string;
  readonly interpretationKind: 'judgment-explanation' | 'line-explanation';
  readonly hexagramId: string;
  readonly kingWenSequence: number;
  readonly hexagramName: string;
  readonly linePosition: number | null;
  readonly lineLabel: string | null;
  readonly canonicalQuoteId: string;
  readonly interpretation: string;
  readonly sourceLocator: string;
  readonly checksum: string;
}

interface AuthorizedInterpretationDataset {
  readonly contentVersion: string;
  readonly source: {
    readonly sourceId: string;
    readonly sourceVersion: string;
    readonly title: string;
    readonly edition: string | null;
    readonly licenseStatus: 'cleared' | 'public-domain' | 'restricted' | 'pending';
    readonly verifiedBy: string | null;
    readonly verifiedAt: string | null;
  };
  readonly publication: {
    readonly displayPurpose: 'educational-reference';
    readonly nonPredictionNotice: string;
  };
  readonly records: readonly AuthorizedInterpretation[];
}

const dataset = authorizedDataset as AuthorizedInterpretationDataset;

export const verifiedInterpretationContentVersion = dataset.contentVersion;
export const verifiedInterpretationSource = dataset.source;
export const verifiedInterpretationPublication = dataset.publication;

const interpretationsByHexagramId = new Map<string, readonly AuthorizedInterpretation[]>();
for (const interpretation of dataset.records) {
  const current = interpretationsByHexagramId.get(interpretation.hexagramId) ?? [];
  interpretationsByHexagramId.set(interpretation.hexagramId, [...current, interpretation]);
}

export interface AuthorizedInterpretationBundle {
  readonly judgment: AuthorizedInterpretation;
  readonly lineInterpretations: readonly AuthorizedInterpretation[];
}

export function getAuthorizedInterpretationBundle(
  hexagramId: string,
): AuthorizedInterpretationBundle {
  const interpretations = interpretationsByHexagramId.get(hexagramId) ?? [];
  const judgment = interpretations.find(
    (interpretation) => interpretation.interpretationKind === 'judgment-explanation',
  );
  if (judgment === undefined) {
    throw new Error(`Verified interpretation data is missing a judgment for ${hexagramId}.`);
  }
  const lineInterpretations = interpretations
    .filter((interpretation) => interpretation.interpretationKind === 'line-explanation')
    .sort((left, right) => (left.linePosition ?? 0) - (right.linePosition ?? 0));
  if (lineInterpretations.length !== 6) {
    throw new Error(`Verified interpretation data is missing line explanations for ${hexagramId}.`);
  }
  return { judgment, lineInterpretations };
}
