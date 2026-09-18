import authorizedDataset from '../../../data/source/classical/liuyao-overview-authorized-v1.json';

export interface ClassicalQuote {
  readonly id: string;
  readonly quoteKind: 'judgment' | 'line-text';
  readonly hexagramId: string;
  readonly kingWenSequence: number;
  readonly hexagramName: string;
  readonly linePosition: number | null;
  readonly lineLabel: string | null;
  readonly text: string;
  readonly sourceLocator: string;
  readonly checksum: string;
}

interface ClassicalQuoteDataset {
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
  readonly records: readonly ClassicalQuote[];
}

const dataset = authorizedDataset as ClassicalQuoteDataset;

export const verifiedClassicalQuoteContentVersion = dataset.contentVersion;
export const verifiedClassicalQuoteSource = dataset.source;

const quotesByHexagramId = new Map<string, readonly ClassicalQuote[]>();
for (const quote of dataset.records) {
  const current = quotesByHexagramId.get(quote.hexagramId) ?? [];
  quotesByHexagramId.set(quote.hexagramId, [...current, quote]);
}

export interface ClassicalQuoteBundle {
  readonly judgment: ClassicalQuote;
  readonly lineTexts: readonly ClassicalQuote[];
}

export function getClassicalQuoteBundle(hexagramId: string): ClassicalQuoteBundle {
  const quotes = quotesByHexagramId.get(hexagramId) ?? [];
  const judgment = quotes.find((quote) => quote.quoteKind === 'judgment');
  if (judgment === undefined) {
    throw new Error(`Verified classical quote data is missing a judgment for ${hexagramId}.`);
  }
  const lineTexts = quotes
    .filter((quote) => quote.quoteKind === 'line-text')
    .sort((left, right) => (left.linePosition ?? 0) - (right.linePosition ?? 0));
  if (lineTexts.length !== 6) {
    throw new Error(`Verified classical quote data is missing line text for ${hexagramId}.`);
  }
  return { judgment, lineTexts };
}
