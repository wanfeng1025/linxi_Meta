import { notFound } from 'next/navigation';
import { getClassicalQuoteBundle, verifiedHexagrams } from '@liuyao/content';
export default async function HexagramPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const hexagram = verifiedHexagrams.find((item) => item.id === id);
  if (!hexagram) notFound();
  const quotes = getClassicalQuoteBundle(hexagram.id);
  return (
    <section className="card">
      <p className="eyebrow">第 {hexagram.kingWenSequence} 卦</p>
      <h1>
        {hexagram.name} <span className="symbol">{hexagram.symbol}</span>
      </h1>
      <dl>
        <dt>下卦</dt>
        <dd>{hexagram.lowerTrigramId}</dd>
        <dt>上卦</dt>
        <dd>{hexagram.upperTrigramId}</dd>
        <dt>结构编码</dt>
        <dd>{hexagram.code}</dd>
        <dt>内容版本</dt>
        <dd>{hexagram.dataVersion}</dd>
      </dl>
      <section className="classical-quotes" aria-labelledby="hexagram-quote-title">
        <p className="eyebrow">已授权数据集 · 原文对照</p>
        <h2 id="hexagram-quote-title">卦辞</h2>
        <blockquote>{quotes.judgment.text}</blockquote>
        <p className="muted">定位：{quotes.judgment.sourceLocator}</p>
        <p className="notice">
          此页仅引用已授权的卦辞原文。爻辞会在起卦结果页按实际动爻显示；彖传、象传、现代释义与专业六爻规则仍未发布。
        </p>
      </section>
    </section>
  );
}
