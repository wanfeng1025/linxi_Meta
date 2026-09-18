import catalogRecordsJson from '../../../data/catalog/index.json';
import { createHexagramCatalog, type HexagramCatalog } from '@/domain/hexagram';

interface CatalogRecord {
  readonly recordType: 'trigram' | 'hexagram';
  readonly status: 'verified';
  readonly source: Readonly<{ contentVersion: string }>;
  readonly content: Readonly<Record<string, unknown>>;
}

export function createProductionHexagramCatalog(): HexagramCatalog {
  const records = catalogRecordsJson as unknown as readonly CatalogRecord[];
  const verified = records.filter((record) => record.status === 'verified');
  const dataVersion = verified[0]?.source.contentVersion;
  if (dataVersion === undefined) {
    throw new Error('The verified production hexagram catalog is empty.');
  }
  return createHexagramCatalog({
    dataVersion,
    trigrams: verified
      .filter((record) => record.recordType === 'trigram')
      .map((record) => record.content),
    hexagrams: verified
      .filter((record) => record.recordType === 'hexagram')
      .map((record) => record.content),
  });
}
