'use client';

import {
  calculateHexagram,
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
import Link from 'next/link';
import { useState } from 'react';

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

function ClassicalQuoteSection({ result }: { result: HexagramCalculationResult }) {
  const primary = getClassicalQuoteBundle(result.primaryHexagram.id);
  const changed = getClassicalQuoteBundle(result.changedHexagram.id);
  const movingLineTexts = primary.lineTexts.filter((quote) =>
    result.movingLines.some((position) => position === quote.linePosition),
  );
  const hasChangedHexagram = result.primaryHexagram.id !== result.changedHexagram.id;

  return (
    <section className="card classical-quotes" aria-labelledby="classical-quotes-title">
      <p className="eyebrow">已授权数据集 · 原文对照</p>
      <h2 id="classical-quotes-title">古籍原文引用</h2>
      <p className="notice">
        下列内容仅为与本卦、动爻和变卦对应的原文引用，不是自动解卦、吉凶判断或现实决策建议。
      </p>
      <div className="quote-stack">
        <article>
          <h3>本卦 · {result.primaryHexagram.name} · 卦辞</h3>
          <blockquote>{primary.judgment.text}</blockquote>
          <p className="muted">定位：{primary.judgment.sourceLocator}</p>
        </article>
        {movingLineTexts.length > 0 ? (
          <article>
            <h3>动爻 · 本次起卦实际变动的位置</h3>
            <ul className="quote-list">
              {movingLineTexts.map((quote) => (
                <li key={quote.id}>
                  <blockquote>{quote.text}</blockquote>
                  <p className="muted">定位：{quote.sourceLocator}</p>
                </li>
              ))}
            </ul>
          </article>
        ) : (
          <p className="muted">本次没有动爻，因此没有额外的动爻原文引用。</p>
        )}
        {hasChangedHexagram ? (
          <article>
            <h3>变卦 · {result.changedHexagram.name} · 卦辞</h3>
            <blockquote>{changed.judgment.text}</blockquote>
            <p className="muted">定位：{changed.judgment.sourceLocator}</p>
          </article>
        ) : (
          <p className="muted">本次无动爻，变卦与本卦相同，故不重复引用。</p>
        )}
      </div>
      <details>
        <summary>来源与版本</summary>
        <p>
          来源：{verifiedClassicalQuoteSource.title}；内容版本：
          {verifiedClassicalQuoteContentVersion}； 授权状态：
          {verifiedClassicalQuoteSource.licenseStatus}。
        </p>
        <p className="muted">
          每条引文均保存来源定位和 SHA-256
          校验值。白话学习参考释义由独立的数据集与版本管理；当前仍未发布彖传、象传、专业六爻规则或
          AI 解读。
        </p>
      </details>
    </section>
  );
}

function InterpretationSection({ result }: { result: HexagramCalculationResult }) {
  const primary = getAuthorizedInterpretationBundle(result.primaryHexagram.id);
  const changed = getAuthorizedInterpretationBundle(result.changedHexagram.id);
  const movingLineInterpretations = primary.lineInterpretations.filter((interpretation) =>
    result.movingLines.some((position) => position === interpretation.linePosition),
  );
  const hasChangedHexagram = result.primaryHexagram.id !== result.changedHexagram.id;

  return (
    <section className="card classical-quotes" aria-labelledby="interpretations-title">
      <p className="eyebrow">已授权数据集 · 学习参考</p>
      <h2 id="interpretations-title">白话释义</h2>
      <p className="notice">{verifiedInterpretationPublication.nonPredictionNotice}</p>
      <div className="quote-stack">
        <article>
          <h3>本卦 · {result.primaryHexagram.name} · 卦辞释义</h3>
          <p>{primary.judgment.interpretation}</p>
          <p className="muted">定位：{primary.judgment.sourceLocator}</p>
        </article>
        {movingLineInterpretations.length > 0 ? (
          <article>
            <h3>动爻 · 本次起卦实际变动的位置</h3>
            <ul className="quote-list">
              {movingLineInterpretations.map((interpretation) => (
                <li key={interpretation.id}>
                  <p>
                    <strong>{interpretation.lineLabel}：</strong>
                    {interpretation.interpretation}
                  </p>
                  <p className="muted">定位：{interpretation.sourceLocator}</p>
                </li>
              ))}
            </ul>
          </article>
        ) : (
          <p className="muted">本次没有动爻，因此没有额外的动爻释义。</p>
        )}
        {hasChangedHexagram ? (
          <article>
            <h3>变卦 · {result.changedHexagram.name} · 卦辞释义</h3>
            <p>{changed.judgment.interpretation}</p>
            <p className="muted">定位：{changed.judgment.sourceLocator}</p>
          </article>
        ) : (
          <p className="muted">本次无动爻，变卦与本卦相同，故不重复显示释义。</p>
        )}
      </div>
      <details>
        <summary>释义来源与使用边界</summary>
        <p>
          来源：{verifiedInterpretationSource.title}；内容版本：
          {verifiedInterpretationContentVersion}；授权状态：
          {verifiedInterpretationSource.licenseStatus}。
        </p>
        <p className="muted">
          本释义只服务于原文学习与结构复盘；不参与三币随机、卦象计算、专业六爻排盘或 AI 输出。
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
    <section>
      <p className="eyebrow">已锁定的结构结果</p>
      <p className="notice">数据未上传云端，不能跨设备同步；关闭会话或清除浏览器数据后可能丢失。</p>
      <div className="grid">
        <article className="card">
          <div className="result-title">
            <h1>本卦：{result.primaryHexagram.name}</h1>
            <span className="symbol" aria-hidden="true">
              {result.primaryHexagram.symbol}
            </span>
          </div>
          <LineDiagram session={stored.session} />
          <p>
            下卦 {result.lowerTrigram.name} · 上卦 {result.upperTrigram.name}
          </p>
        </article>
        <article className="card">
          <div className="result-title">
            <h2>变卦：{result.changedHexagram.name}</h2>
            <span className="symbol" aria-hidden="true">
              {result.changedHexagram.symbol}
            </span>
          </div>
          <p>动爻：{result.movingLines.length > 0 ? result.movingLines.join('、') : '无'}</p>
          <p className="muted">
            规则版本 {result.rulesetVersion} · 结构数据版本 {result.mappingDataVersion}
          </p>
        </article>
      </div>
      <section className="card" aria-labelledby="casting-record-title">
        <h2 id="casting-record-title">本次起卦原始记录</h2>
        <p className="muted">按初爻到上爻保存；每一爻都保留三枚铜钱的原始值和合计，方便复核。</p>
        <ol className="record-list">
          {stored.session.lines.map((line) => (
            <li key={line.position}>
              第 {line.position} 爻：铜钱 {line.coins.join(' + ')} = {line.value} ·{' '}
              {line.polarity === 'yang' ? '阳爻' : '阴爻'} ·{' '}
              {line.movement === 'moving' ? '动爻' : '静爻'}
            </li>
          ))}
        </ol>
      </section>
      {stored.question.length > 0 && (
        <section className="card">
          <h2>本次问题</h2>
          <p>{stored.question}</p>
        </section>
      )}
      <ClassicalQuoteSection result={result} />
      <InterpretationSection result={result} />
      <section className="grid" aria-label="结构化复盘入口">
        <article className="card">
          <h2>下一步：查看卦象结构</h2>
          <p>可浏览本卦与变卦的已核验名称、符号和上下卦映射；本网站不把这些结构生成吉凶判断。</p>
          <div className="actions">
            <Link className="button secondary" href={`/hexagrams/${result.primaryHexagram.id}`}>
              浏览本卦结构
            </Link>
            <Link className="button secondary" href={`/hexagrams/${result.changedHexagram.id}`}>
              浏览变卦结构
            </Link>
          </div>
        </article>
        <article className="card">
          <h2>重新开始一轮匿名起卦</h2>
          <p>新一轮会生成新的浏览器会话；旧记录不会上传，也不会自动合并或同步。</p>
          <Link className="button" href="/casting">
            开始新的起卦
          </Link>
        </article>
      </section>
      <section className="card">
        <h2>功能状态</h2>
        <p>
          自动解卦、AI
          和专业六爻规则尚未发布。本页展示可复核的三币结构事实、已授权原文引用及学习参考释义；不会从这些内容生成针对本次问题的吉凶结论。
        </p>
        <p>
          <Link href="/methodology">查看这些结构如何计算，以及未发布功能的审核条件</Link>
        </p>
      </section>
    </section>
  );
}
