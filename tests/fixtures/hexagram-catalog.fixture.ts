/**
 * Test-only, non-production fixture.
 *
 * The symbols and English names are cross-checked against the Unicode Yijing
 * names list. The two hexagram sequence/name fixtures are also visible on the
 * Chinese Text Project I Ching index. They remain unverified for product use.
 */
export const TEST_FIXTURE_SOURCE_NOTES = Object.freeze({
  status: 'pending-test-only',
  checkedAt: '2026-07-20',
  unicodeTrigramNamesList: 'https://www.unicode.org/charts/nameslist/n_2600.html',
  unicodeHexagramNamesList: 'https://www.unicode.org/charts/nameslist/n_4DC0.html',
  unicodeTerms: 'https://www.unicode.org/copyright.html',
  ctextIndex: 'https://ctext.org/book-of-changes/yi-jing/zh',
});

export const TEST_MAPPING_DATA_VERSION = 'test-only-unverified-unicode-ctext-2026-07-20-v1';

export const PARTIAL_HEXAGRAM_CATALOG_INPUT = {
  dataVersion: TEST_MAPPING_DATA_VERSION,
  trigrams: [
    {
      id: 'test-trigram-earth',
      name: 'Earth',
      symbol: '☷',
      code: '000',
      lineBits: [0, 0, 0],
      element: null,
      direction: null,
      dataVersion: TEST_MAPPING_DATA_VERSION,
    },
    {
      id: 'test-trigram-mountain',
      name: 'Mountain',
      symbol: '☶',
      code: '001',
      lineBits: [0, 0, 1],
      element: null,
      direction: null,
      dataVersion: TEST_MAPPING_DATA_VERSION,
    },
    {
      id: 'test-trigram-water',
      name: 'Water',
      symbol: '☵',
      code: '010',
      lineBits: [0, 1, 0],
      element: null,
      direction: null,
      dataVersion: TEST_MAPPING_DATA_VERSION,
    },
    {
      id: 'test-trigram-wind',
      name: 'Wind',
      symbol: '☴',
      code: '011',
      lineBits: [0, 1, 1],
      element: null,
      direction: null,
      dataVersion: TEST_MAPPING_DATA_VERSION,
    },
    {
      id: 'test-trigram-thunder',
      name: 'Thunder',
      symbol: '☳',
      code: '100',
      lineBits: [1, 0, 0],
      element: null,
      direction: null,
      dataVersion: TEST_MAPPING_DATA_VERSION,
    },
    {
      id: 'test-trigram-fire',
      name: 'Fire',
      symbol: '☲',
      code: '101',
      lineBits: [1, 0, 1],
      element: null,
      direction: null,
      dataVersion: TEST_MAPPING_DATA_VERSION,
    },
    {
      id: 'test-trigram-lake',
      name: 'Lake',
      symbol: '☱',
      code: '110',
      lineBits: [1, 1, 0],
      element: null,
      direction: null,
      dataVersion: TEST_MAPPING_DATA_VERSION,
    },
    {
      id: 'test-trigram-heaven',
      name: 'Heaven',
      symbol: '☰',
      code: '111',
      lineBits: [1, 1, 1],
      element: null,
      direction: null,
      dataVersion: TEST_MAPPING_DATA_VERSION,
    },
  ],
  hexagrams: [
    {
      id: 'test-hexagram-qian',
      kingWenSequence: 1,
      name: 'Creative Heaven',
      symbol: '䷀',
      upperTrigramId: 'test-trigram-heaven',
      lowerTrigramId: 'test-trigram-heaven',
      code: '111111',
      lineBits: [1, 1, 1, 1, 1, 1],
      dataVersion: TEST_MAPPING_DATA_VERSION,
    },
    {
      id: 'test-hexagram-kun',
      kingWenSequence: 2,
      name: 'Receptive Earth',
      symbol: '䷁',
      upperTrigramId: 'test-trigram-earth',
      lowerTrigramId: 'test-trigram-earth',
      code: '000000',
      lineBits: [0, 0, 0, 0, 0, 0],
      dataVersion: TEST_MAPPING_DATA_VERSION,
    },
  ],
} as const;
