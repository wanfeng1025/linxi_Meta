'use client';

import {
  calculateHexagram,
  formatMovingLinePositions,
  formatHexagramLabel,
  type CastingSession,
  type HexagramCalculationResult,
} from '@liuyao/domain';
import {
  getAuthorizedInterpretationBundle,
  getClassicalQuoteBundle,
  verifiedClassicalQuoteContentVersion,
  verifiedClassicalQuoteSource,
  verifiedHexagramCatalog,
  verifiedInterpretationContentVersion,
  verifiedInterpretationPublication,
  verifiedInterpretationSource,
} from '@liuyao/content';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';

import { ResultActions } from '../../../components/result-actions';
import { loadWebCastingSnapshot, type WebCastingSnapshot } from '../../../lib/session-storage';

function LineDiagram({ session }: { session: CastingSession }) {
  return (
    <div className="lines" aria-label="卦象，视觉顺序为上爻到初爻">
      {[...session.lines].reverse().map((line) => (
        <div
          key={line.position}
          className={`line ${line.polarity} ${line.movement === 'moving' ? 'moving' : ''}`}
          aria-label={`第 ${line.position} 爻：${line.polarity === 'yang' ? '阳爻' : '阴爻'}，${line.movement === 'moving' ? '动爻' : '静爻'}`}
        >
          <span />
          <span className={line.polarity === 'yin' ? '' : 'hidden'} />
        </div>
      ))}
    </div>
  );
}

interface ResultState {
  readonly stored: WebCastingSnapshot;
  readonly result: HexagramCalculationResult;
}

interface ContentRow {
  readonly id: string;
  readonly label: string;
  readonly quote: string;
  readonly interpretation: string;
  readonly quoteSourceLocator: string;
  readonly interpretationSourceLocator?: string;
}

function AuthorizedDatasetSection({ result }: { result: HexagramCalculationResult }) {
  const primaryQuotes = getClassicalQuoteBundle(result.primaryHexagram.id);
  const primaryInterpretations = getAuthorizedInterpretationBundle(result.primaryHexagram.id);
  const movingPositions = new Set<number>(result.movingLines);
  const rows: ContentRow[] = [
    {
      id: 'primary-judgment',
      label: `本卦 · ${result.primaryHexagram.name} · 卦辞`,
      quote: primaryQuotes.judgment.text,
      interpretation: primaryInterpretations.judgment.interpretation,
      quoteSourceLocator: primaryQuotes.judgment.sourceLocator,
      interpretationSourceLocator: primaryInterpretations.judgment.sourceLocator,
    },
  ];

  primaryQuotes.lineTexts
    .filter((quote) => quote.linePosition !== null && movingPositions.has(quote.linePosition))
    .forEach((quote) => {
      const interpretation = primaryInterpretations.lineInterpretations.find(
        (candidate) => candidate.linePosition === quote.linePosition,
      );
      rows.push({
        id: quote.id,
        label: `动爻 · ${quote.lineLabel}`,
        quote: quote.text,
        interpretation: interpretation?.interpretation ?? '当前没有对应的白话学习参考。',
        quoteSourceLocator: quote.sourceLocator,
        interpretationSourceLocator: interpretation?.sourceLocator,
      });
    });

  if (result.changeStatus === 'CHANGING') {
    const changedQuotes = getClassicalQuoteBundle(result.changedHexagram.id);
    const changedInterpretations = getAuthorizedInterpretationBundle(result.changedHexagram.id);
    rows.push({
      id: 'changed-judgment',
      label: `变卦 · ${result.changedHexagram.name} · 卦辞`,
      quote: changedQuotes.judgment.text,
      interpretation: changedInterpretations.judgment.interpretation,
      quoteSourceLocator: changedQuotes.judgment.sourceLocator,
      interpretationSourceLocator: changedInterpretations.judgment.sourceLocator,
    });
  }

  return (
    <section className="card authorized-dataset" aria-labelledby="authorized-dataset-title">
      <p className="eyebrow">已授权数据集</p>
      <h2 id="authorized-dataset-title">原文与解释</h2>
      <p className="notice">原文保持核验版本，白话解释只用于学习参考，不生成针对本次问题的结论。</p>
      <div className="dataset-table">
        <div className="dataset-header" aria-hidden="true">
          <span>原文</span>
          <span>白话解释</span>
        </div>
        {rows.map((row) => (
          <article className="dataset-row" key={row.id}>
            <div>
              <h3>{row.label}</h3>
              <blockquote>{row.quote}</blockquote>
            </div>
            <div>
              <h3 className="sr-only">{row.label} · 白话解释</h3>
              <p>{row.interpretation}</p>
            </div>
          </article>
        ))}
      </div>
      <details>
        <summary>来源与版本</summary>
        <p>
          原文来源：{verifiedClassicalQuoteSource.title}；内容版本：
          {verifiedClassicalQuoteContentVersion}；授权状态：
          {verifiedClassicalQuoteSource.licenseStatus}。
        </p>
        <p>
          白话参考来源：{verifiedInterpretationSource.title}；内容版本：
          {verifiedInterpretationContentVersion}；授权状态：
          {verifiedInterpretationSource.licenseStatus}。
        </p>
        <p className="muted">
          每条内容仍在结构数据中保留来源定位和校验值；前端不展示文件名定位，避免把审计字段误读为结论。
          {verifiedInterpretationPublication.nonPredictionNotice}
        </p>
      </details>
    </section>
  );
}

export function ResultView({ sessionId }: { sessionId: string }) {
  const [view] = useState<ResultState | null>(() => {
    if (typeof window === 'undefined') return null;
    const snapshot = loadWebCastingSnapshot(sessionStorage, sessionId);
    if (snapshot === null || snapshot.session.status !== 'locked') return null;
    try {
      return {
        stored: snapshot,
        result: calculateHexagram({
          originalLines: snapshot.session.lines.map((line) => ({
            position: line.position,
            value: line.value,
          })),
          rulesetVersion: snapshot.session.rulesetVersion,
          catalog: verifiedHexagramCatalog,
        }),
      };
    } catch {
      return null;
    }
  });

  if (view === null) {
    return (
      <section className="card">
        <h1>找不到本次结果</h1>
        <p>匿名记录仅保存在当前浏览器会话，链接不能在其他设备或清理数据后恢复。</p>
        <Link className="button" href="/casting">
          重新开始
        </Link>
      </section>
    );
  }

  const { result, stored } = view;
  return (
    <section className="result-page">
      <div className="result-atmosphere" aria-hidden="true">
        <Image src="/visuals/result-ink-atmosphere.webp" alt="" fill sizes="100vw" />
      </div>
      <div className="result-content">
        <p className="eyebrow">已锁定的结构结果</p>
        <p className="notice">
          数据未上传云端，不能跨设备同步；关闭会话或清除浏览器数据后可能丢失。
        </p>
        <div className="result-hexagrams">
          <article className="result-card">
            <div className="result-title">
              <div>
                <p className="result-kicker">本卦</p>
                <h1>{formatHexagramLabel(result.primaryHexagram)}</h1>
              </div>
              <span className="symbol" aria-hidden="true">
                {result.primaryHexagram.symbol}
              </span>
            </div>
            <LineDiagram session={stored.session} />
            <p className="result-meta">
              下卦 {result.lowerTrigram.name} · 上卦 {result.upperTrigram.name}
            </p>
          </article>
          {result.changeStatus === 'CHANGING' ? (
            <article className="result-card result-card-changed">
              <div className="result-title">
                <div>
                  <p className="result-kicker">变卦</p>
                  <h2>{formatHexagramLabel(result.changedHexagram)}</h2>
                </div>
                <span className="symbol" aria-hidden="true">
                  {result.changedHexagram.symbol}
                </span>
              </div>
              <p className="result-meta">
                状态：动卦 · {formatMovingLinePositions(result.movingLines)}动
              </p>
              <p className="result-meta">
                下卦 {result.changedLowerTrigram.name} · 上卦 {result.changedUpperTrigram.name}
              </p>
              <p className="muted">计算规则与结构数据均已版本化锁定，可随 JSON 一并导出复核。</p>
              {stored.question.length > 0 && (
                <div className="result-question">
                  <h3>本次问题</h3>
                  <p>{stored.question}</p>
                </div>
              )}
            </article>
          ) : (
            <article className="result-card result-card-static">
              <p className="result-kicker">卦态</p>
              <h2>静卦 · 无动爻</h2>
              <p className="muted">本次无动爻，不产生独立变卦。</p>
              <p className="muted">计算规则与结构数据均已版本化锁定，可随 JSON 一并导出复核。</p>
              {stored.question.length > 0 && (
                <div className="result-question">
                  <h3>本次问题</h3>
                  <p>{stored.question}</p>
                </div>
              )}
            </article>
          )}
        </div>

        <section className="card record-card" aria-labelledby="casting-record-title">
          <p className="eyebrow">原始事实</p>
          <h2 id="casting-record-title">本次起卦原始记录</h2>
          <p className="muted">按初爻到上爻保存；每一爻都保留三枚铜钱的原始值和合计，方便复核。</p>
          <ol className="record-list">
            {stored.session.lines.map((line) => (
              <li key={line.position}>
                <span>第 {line.position} 爻</span>
                <span>
                  铜钱 {line.coins.join(' + ')} = {line.value}
                </span>
                <span>
                  {line.polarity === 'yang' ? '阳爻' : '阴爻'} ·{' '}
                  {line.movement === 'moving' ? '动爻' : '静爻'}
                </span>
              </li>
            ))}
          </ol>
        </section>
        <ResultActions stored={stored} result={result} />
        <AuthorizedDatasetSection result={result} />
        <section className="result-next-steps" aria-label="结构化复盘入口">
          <article className="card">
            <p className="eyebrow">下一步</p>
            <h2>查看卦象结构</h2>
            <p>
              {result.changeStatus === 'CHANGING'
                ? '可浏览本卦与变卦的已核验名称、符号和上下卦映射。'
                : '可浏览本卦的已核验名称、符号和上下卦映射。'}
            </p>
            <div className="actions">
              <Link className="button secondary" href={`/hexagrams/${result.primaryHexagram.id}`}>
                浏览本卦结构
              </Link>
              {result.changeStatus === 'CHANGING' && (
                <Link className="button secondary" href={`/hexagrams/${result.changedHexagram.id}`}>
                  浏览变卦结构
                </Link>
              )}
            </div>
          </article>
          <article className="card">
            <p className="eyebrow">重新开始</p>
            <h2>一轮新的匿名起卦</h2>
            <p>新一轮会生成新的浏览器会话；旧记录不会上传，也不会自动合并或同步。</p>
            <Link className="button" href="/casting">
              开始新的起卦
            </Link>
          </article>
        </section>
      </div>
    </section>
  );
}
