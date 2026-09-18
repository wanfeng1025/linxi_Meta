import {
  createHexagramCatalog,
  type HexagramCatalog,
  type HexagramDefinition,
} from '@liuyao/domain';

import catalogRecords from '../../../data/catalog/index.json';

type VerifiedRecord = {
  readonly recordType: 'trigram' | 'hexagram';
  readonly status: 'verified';
  readonly source: { readonly contentVersion: string };
  readonly content: Record<string, unknown>;
};

const records = catalogRecords as unknown as readonly VerifiedRecord[];
const trigrams = records.filter(
  (record) => record.status === 'verified' && record.recordType === 'trigram',
);
const hexagrams = records.filter(
  (record) => record.status === 'verified' && record.recordType === 'hexagram',
);
const contentVersion = trigrams[0]?.source.contentVersion;

if (contentVersion === undefined) {
  throw new Error('The verified hexagram catalog has no content version.');
}

export const verifiedHexagramCatalog: HexagramCatalog = createHexagramCatalog({
  dataVersion: contentVersion,
  trigrams: trigrams.map((record) => record.content),
  hexagrams: hexagrams.map((record) => record.content),
});

export const verifiedHexagrams: readonly HexagramDefinition[] = verifiedHexagramCatalog.hexagrams;
export const verifiedContentVersion = verifiedHexagramCatalog.dataVersion;

export {
  getClassicalQuoteBundle,
  verifiedClassicalQuoteContentVersion,
  verifiedClassicalQuoteSource,
  type ClassicalQuote,
  type ClassicalQuoteBundle,
} from './classical-quotes';

export {
  getAuthorizedInterpretationBundle,
  verifiedInterpretationContentVersion,
  verifiedInterpretationPublication,
  verifiedInterpretationSource,
  type AuthorizedInterpretation,
  type AuthorizedInterpretationBundle,
} from './authorized-interpretations';

export {
  publicMethodology,
  publicMethodologyVersion,
  type CandidateCollectionStatus,
  type MethodologyPrinciple,
  type PublicationLayer,
} from './public-methodology';
