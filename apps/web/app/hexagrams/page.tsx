import { verifiedHexagramCatalog, verifiedHexagrams } from '@liuyao/content';
import { HexagramExplorer, type HexagramExplorerItem } from '../../components/hexagram-explorer';

export default function HexagramsPage() {
  const trigramsById = new Map(
    verifiedHexagramCatalog.trigrams.map((trigram) => [trigram.id, trigram]),
  );
  const items: HexagramExplorerItem[] = [...verifiedHexagrams]
    .sort((a, b) => a.kingWenSequence - b.kingWenSequence)
    .flatMap((hexagram) => {
      const upper = trigramsById.get(hexagram.upperTrigramId);
      const lower = trigramsById.get(hexagram.lowerTrigramId);
      if (upper === undefined || lower === undefined) return [];
      return [
        {
          id: hexagram.id,
          name: hexagram.name,
          symbol: hexagram.symbol,
          sequence: hexagram.kingWenSequence,
          upperTrigramId: hexagram.upperTrigramId,
          lowerTrigramId: hexagram.lowerTrigramId,
          upperName: upper.name,
          lowerName: lower.name,
        },
      ];
    });

  return (
    <section>
      <p className="eyebrow">已核验结构目录</p>
      <h1 id="hexagram-directory-title">六十四卦</h1>
      <p className="lead compact-lead">
        以 8 个上卦 × 8 个下卦展开已核验结构。搜索、筛选或按编号浏览，不补写未经核验的经文与解释。
      </p>
      <HexagramExplorer items={items} trigrams={verifiedHexagramCatalog.trigrams} />
    </section>
  );
}
