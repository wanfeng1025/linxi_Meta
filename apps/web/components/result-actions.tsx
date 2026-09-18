'use client';

import type { HexagramCalculationResult } from '@liuyao/domain';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { clearWebCastingSnapshot, type WebCastingSnapshot } from '../lib/session-storage';

const DISCLAIMER = '灵犀 Meta｜仅供文化娱乐与个人反思，不构成专业建议';

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function drawWrappedText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number,
): number {
  const characters = [...text.replaceAll(/\s+/g, ' ').trim()];
  let line = '';
  let lineIndex = 0;
  for (const character of characters) {
    const candidate = `${line}${character}`;
    if (context.measureText(candidate).width > maxWidth && line.length > 0) {
      context.fillText(line, x, y + lineIndex * lineHeight);
      line = character;
      lineIndex += 1;
      if (lineIndex >= maxLines) return y + lineIndex * lineHeight;
    } else {
      line = candidate;
    }
  }
  if (line.length > 0 && lineIndex < maxLines) {
    context.fillText(line, x, y + lineIndex * lineHeight);
    lineIndex += 1;
  }
  return y + lineIndex * lineHeight;
}

function drawHexagram(
  context: CanvasRenderingContext2D,
  bits: readonly number[],
  movingLines: readonly number[],
  x: number,
  y: number,
): void {
  const width = 250;
  const gap = 22;
  const lineHeight = 14;
  [...bits].reverse().forEach((bit, visualIndex) => {
    const position = 6 - visualIndex;
    context.fillStyle = movingLines.includes(position) ? '#8b3027' : '#173c33';
    const top = y + visualIndex * gap;
    if (bit === 1) {
      context.fillRect(x, top, width, lineHeight);
    } else {
      context.fillRect(x, top, 105, lineHeight);
      context.fillRect(x + 145, top, 105, lineHeight);
    }
  });
}

function drawTaiji(context: CanvasRenderingContext2D, x: number, y: number, radius: number): void {
  context.save();
  context.translate(x, y);
  context.fillStyle = '#173c33';
  context.beginPath();
  context.arc(0, 0, radius, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = '#f3ead6';
  context.beginPath();
  context.arc(0, -radius / 2, radius / 2, 0, Math.PI * 2);
  context.arc(0, radius / 2, radius / 2, 0, Math.PI * 2, true);
  context.fill();
  context.fillStyle = '#f3ead6';
  context.beginPath();
  context.arc(0, -radius / 2, radius / 8, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = '#173c33';
  context.beginPath();
  context.arc(0, radius / 2, radius / 8, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

interface ResultActionsProps {
  readonly stored: WebCastingSnapshot;
  readonly result: HexagramCalculationResult;
}

export function ResultActions({ stored, result }: ResultActionsProps) {
  const router = useRouter();
  const [includeQuestion, setIncludeQuestion] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  const exportJson = () => {
    const payload = {
      product: '灵犀 Meta',
      exportedAt: new Date().toISOString(),
      privacy: { questionIncluded: includeQuestion },
      question: includeQuestion ? stored.question : undefined,
      session: stored.session,
      result,
      disclaimer: DISCLAIMER,
    };
    downloadBlob(
      new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' }),
      `lingxi-meta-${stored.session.sessionId}.json`,
    );
  };

  const exportPng = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = includeQuestion && stored.question.length > 0 ? 900 : 760;
    const context = canvas.getContext('2d');
    if (context === null) return;

    const background = context.createLinearGradient(0, 0, 1200, canvas.height);
    background.addColorStop(0, '#fbf5e7');
    background.addColorStop(1, '#e6d6b4');
    context.fillStyle = background;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = '#b49862';
    context.lineWidth = 2;
    context.strokeRect(38, 38, canvas.width - 76, canvas.height - 76);

    drawTaiji(context, 112, 112, 44);
    context.fillStyle = '#173c33';
    context.font = '700 48px "Microsoft YaHei", sans-serif';
    context.fillText('灵犀 Meta', 184, 126);
    context.fillStyle = '#785019';
    context.font = '600 22px "Microsoft YaHei", sans-serif';
    context.fillText('匿名 · 结构可复核 · 原始三币值已保留', 184, 162);

    context.fillStyle = '#14211c';
    context.font = '700 38px "Microsoft YaHei", sans-serif';
    context.fillText(
      `本卦 · ${result.primaryHexagram.name} ${result.primaryHexagram.symbol}`,
      120,
      250,
    );
    context.fillText(
      `变卦 · ${result.changedHexagram.name} ${result.changedHexagram.symbol}`,
      690,
      250,
    );
    drawHexagram(context, result.primaryLineBits, result.movingLines, 120, 300);
    drawHexagram(context, result.changedLineBits, [], 690, 300);

    context.fillStyle = '#3f5149';
    context.font = '500 23px "Microsoft YaHei", sans-serif';
    context.fillText(
      `下卦 ${result.lowerTrigram.name} · 上卦 ${result.upperTrigram.name}`,
      120,
      468,
    );
    context.fillText(
      `动爻：${result.movingLines.length > 0 ? result.movingLines.join('、') : '无'}`,
      120,
      516,
    );

    let footerY = 590;
    if (includeQuestion && stored.question.length > 0) {
      context.fillStyle = '#14211c';
      context.font = '700 25px "Microsoft YaHei", sans-serif';
      context.fillText('本次问题', 120, 584);
      context.fillStyle = '#3f5149';
      context.font = '500 22px "Microsoft YaHei", sans-serif';
      footerY = drawWrappedText(context, stored.question, 120, 628, 960, 36, 4) + 38;
    }

    context.fillStyle = '#71251f';
    context.font = '600 20px "Microsoft YaHei", sans-serif';
    context.fillText(DISCLAIMER, 120, Math.min(footerY, canvas.height - 72));
    canvas.toBlob((blob) => {
      if (blob !== null) downloadBlob(blob, `lingxi-meta-${stored.session.sessionId}.png`);
    }, 'image/png');
  };

  const clear = () => {
    clearWebCastingSnapshot(sessionStorage, stored.session.sessionId);
    router.replace('/casting');
  };

  return (
    <section className="card" aria-labelledby="result-actions-title">
      <p className="eyebrow">本机数据控制</p>
      <h2 id="result-actions-title">导出或清除本次结果</h2>
      <p className="muted">
        JSON 保留可复核的结构数据，PNG 适合本地保存与分享。两种导出均只在你的浏览器中生成。
      </p>
      {stored.question.length > 0 && (
        <label className="privacy-choice">
          <input
            type="checkbox"
            checked={includeQuestion}
            onChange={(event) => setIncludeQuestion(event.target.checked)}
          />
          导出时包含我填写的问题（默认关闭，避免分享时泄露隐私）
        </label>
      )}
      <div className="export-actions">
        <button className="button secondary" type="button" onClick={exportJson}>
          导出 JSON
        </button>
        <button className="button secondary" type="button" onClick={exportPng}>
          导出 PNG
        </button>
        <button className="button danger" type="button" onClick={() => setConfirmClear(true)}>
          清除本次会话
        </button>
      </div>
      {confirmClear && (
        <div className="confirm-panel" role="alertdialog" aria-labelledby="clear-session-title">
          <p id="clear-session-title">
            这只会删除当前浏览器会话中的本次记录，无法撤销；不会影响已经下载的文件。
          </p>
          <div className="export-actions">
            <button className="button danger" type="button" onClick={clear}>
              确认清除
            </button>
            <button
              className="button secondary"
              type="button"
              onClick={() => setConfirmClear(false)}
            >
              取消
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
