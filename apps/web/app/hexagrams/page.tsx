import Link from 'next/link';
import { verifiedHexagrams } from '@liuyao/content';
export default function HexagramsPage() {
  return (
    <section>
      <p className="eyebrow">已核验结构目录</p>
      <h1>六十四卦</h1>
      <p className="muted">仅展示名称、符号、上下卦与稳定编号；不补写未经核验的经文或解释。</p>
      <div className="catalog">
        {[...verifiedHexagrams]
          .sort((a, b) => a.kingWenSequence - b.kingWenSequence)
          .map((hexagram) => (
            <Link key={hexagram.id} href={`/hexagrams/${hexagram.id}`}>
              <strong>
                {hexagram.kingWenSequence}. {hexagram.name} {hexagram.symbol}
              </strong>
              <br />
              <small>
                {hexagram.lowerTrigramId} / {hexagram.upperTrigramId}
              </small>
            </Link>
          ))}
      </div>
    </section>
  );
}
