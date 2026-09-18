'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

export interface HexagramExplorerItem {
  readonly id: string;
  readonly name: string;
  readonly symbol: string;
  readonly sequence: number;
  readonly upperTrigramId: string;
  readonly lowerTrigramId: string;
  readonly upperName: string;
  readonly lowerName: string;
}

interface HexagramExplorerProps {
  readonly items: readonly HexagramExplorerItem[];
  readonly trigrams: readonly { id: string; name: string }[];
}

export function HexagramExplorer({ items, trigrams }: HexagramExplorerProps) {
  const [query, setQuery] = useState('');
  const [upper, setUpper] = useState('all');
  const [lower, setLower] = useState('all');
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return items.filter((item) => {
      const matchesQuery =
        normalized.length === 0 ||
        item.name.toLowerCase().includes(normalized) ||
        item.symbol.includes(normalized) ||
        String(item.sequence).padStart(2, '0').includes(normalized);
      return (
        matchesQuery &&
        (upper === 'all' || item.upperTrigramId === upper) &&
        (lower === 'all' || item.lowerTrigramId === lower)
      );
    });
  }, [items, lower, query, upper]);

  return (
    <section aria-labelledby="hexagram-directory-title">
      <div className="catalog-toolbar">
        <label className="filter-field" htmlFor="hexagram-search">
          搜索卦名、编号或卦象
          <input
            id="hexagram-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="例如：乾、01、䷀"
          />
        </label>
        <label className="filter-field" htmlFor="upper-trigram-filter">
          上卦
          <select
            id="upper-trigram-filter"
            value={upper}
            onChange={(event) => setUpper(event.target.value)}
          >
            <option value="all">全部上卦</option>
            {trigrams.map((trigram) => (
              <option key={trigram.id} value={trigram.id}>
                {trigram.name}
              </option>
            ))}
          </select>
        </label>
        <label className="filter-field" htmlFor="lower-trigram-filter">
          下卦
          <select
            id="lower-trigram-filter"
            value={lower}
            onChange={(event) => setLower(event.target.value)}
          >
            <option value="all">全部下卦</option>
            {trigrams.map((trigram) => (
              <option key={trigram.id} value={trigram.id}>
                {trigram.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="catalog-summary" role="status" aria-live="polite">
        显示 {filtered.length} / {items.length} 卦 · 8 个上卦 × 8 个下卦
      </p>
      {filtered.length > 0 ? (
        <div className="catalog" aria-label="六十四卦 8×8 结构目录">
          {filtered.map((hexagram) => (
            <Link key={hexagram.id} href={`/hexagrams/${hexagram.id}`}>
              <span className="catalog-symbol" aria-hidden="true">
                {hexagram.symbol}
              </span>
              <span className="catalog-sequence">{String(hexagram.sequence).padStart(2, '0')}</span>
              <strong>{hexagram.name}</strong>
              <small className="trigram-pair">
                {hexagram.lowerName}下 · {hexagram.upperName}上
              </small>
            </Link>
          ))}
        </div>
      ) : (
        <p className="catalog-empty">没有符合条件的卦。可以清空搜索或恢复全部筛选。</p>
      )}
    </section>
  );
}
