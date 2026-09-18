'use client';

import {
  calculateHexagram,
  castNextLine,
  createCastingSession,
  drawThreeCoins,
  lockCastingSession,
  type CastingSession,
} from '@liuyao/domain';
import { verifiedHexagramCatalog } from '@liuyao/content';
import { gsap } from 'gsap';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';

import {
  loadActiveWebCastingSnapshot,
  saveWebCastingSnapshot,
  type WebCastingSnapshot,
} from '../../lib/session-storage';
import { createWebCryptoRandomSource } from '../../lib/web-crypto-random';

const now = () => new Date().toISOString();

const questionStarters = [
  {
    id: 'situation',
    title: '明确一个情境',
    template: '我想梳理的具体情境是：',
  },
  {
    id: 'choice',
    title: '写下正在权衡的选择',
    template: '我正在权衡的选择是：',
  },
  {
    id: 'review-window',
    title: '设定回看时间',
    template: '我希望在以下时间范围内回看这个问题：',
  },
] as const;

function createSnapshot(
  question: string,
  session: CastingSession,
  result: WebCastingSnapshot['result'] = null,
): WebCastingSnapshot {
  return { schemaVersion: 'web-casting-session-v1', question, session, result };
}

export function CastingWorkflow() {
  const router = useRouter();
  const randomSource = useMemo(() => createWebCryptoRandomSource(), []);
  const [restoredSnapshot] = useState(() => {
    if (typeof window === 'undefined') return null;
    const restored = loadActiveWebCastingSnapshot(sessionStorage);
    return restored?.session.status === 'locked' ? null : restored;
  });
  const [question, setQuestion] = useState(() => restoredSnapshot?.question ?? '');
  const [session, setSession] = useState<CastingSession | null>(
    () => restoredSnapshot?.session ?? null,
  );
  const [error, setError] = useState<string | null>(null);
  const [isCasting, setIsCasting] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);

  const persist = (
    nextSession: CastingSession,
    active: boolean,
    result: WebCastingSnapshot['result'] = null,
  ) => {
    saveWebCastingSnapshot(sessionStorage, createSnapshot(question, nextSession, result), {
      active,
    });
  };

  const begin = () => {
    try {
      const created = createCastingSession({
        sessionId: crypto.randomUUID(),
        method: 'tap',
        inputSchemaVersion: 'web-input-v1',
        rulesetVersion: 'hexagram-structure-v1',
        randomAlgorithmVersion: randomSource.algorithmVersion,
        createdAt: now(),
      });
      persist(created, true);
      setSession(created);
      setError(null);
    } catch {
      setError('无法创建本次起卦会话。请确认浏览器允许本地会话存储后重试。');
    }
  };

  const cast = async () => {
    if (session === null || isCasting) return;
    setIsCasting(true);
    try {
      const next = castNextLine(session, await drawThreeCoins(randomSource), now());
      persist(next, true);
      setSession(next);
      setError(null);
    } catch {
      setError('本次起爻未能保存，请重试。');
    } finally {
      setIsCasting(false);
    }
  };

  const lock = () => {
    if (session === null) return;
    try {
      const locked = lockCastingSession(session, now());
      const result = calculateHexagram({
        originalLines: locked.lines.map((line) => ({ position: line.position, value: line.value })),
        rulesetVersion: locked.rulesetVersion,
        catalog: verifiedHexagramCatalog,
      });
      persist(locked, false, result);
      setSession(locked);
      router.push(`/result/${locked.sessionId}`);
    } catch {
      setError('结果未能锁定或保存。请返回后重新开始一次起卦。');
    }
  };

  const latestLine = session?.lines.at(-1);

  useEffect(() => {
    const stage = stageRef.current;
    if (stage === null || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!window.matchMedia('(pointer: fine)').matches) return;

    const move = (event: PointerEvent) => {
      const bounds = stage.getBoundingClientRect();
      const x = (event.clientX - bounds.left) / bounds.width - 0.5;
      const y = (event.clientY - bounds.top) / bounds.height - 0.5;
      gsap.to(stage, {
        rotateX: y * -2.5,
        rotateY: x * 2.5,
        duration: 0.45,
        ease: 'power2.out',
        transformPerspective: 900,
      });
    };
    const leave = () => gsap.to(stage, { rotateX: 0, rotateY: 0, duration: 0.5 });

    stage.addEventListener('pointermove', move);
    stage.addEventListener('pointerleave', leave);
    return () => {
      stage.removeEventListener('pointermove', move);
      stage.removeEventListener('pointerleave', leave);
      gsap.killTweensOf(stage);
    };
  }, []);

  useEffect(() => {
    const stage = stageRef.current;
    if (stage === null || latestLine === undefined) return;

    const media = gsap.matchMedia();
    media.add('(prefers-reduced-motion: no-preference)', () => {
      const context = gsap.context(() => {
        gsap.fromTo(
          '.coin',
          { y: -72, rotateX: -360, rotateZ: -18, opacity: 0 },
          {
            y: 0,
            rotateX: 0,
            rotateZ: 0,
            opacity: 1,
            duration: 0.8,
            stagger: 0.09,
            ease: 'back.out(1.5)',
          },
        );
        gsap.fromTo(
          `.line-slot[data-position="${latestLine.position}"]`,
          { scaleX: 0, opacity: 0.2 },
          { scaleX: 1, opacity: 1, duration: 0.55, ease: 'power2.out' },
        );
      }, stage);
      return () => context.revert();
    });

    return () => media.revert();
  }, [latestLine]);

  return (
    <section className="grid">
      <div className="card">
        <p className="eyebrow">匿名起卦</p>
        <h1>
          {session === null
            ? '写下你的问题（可选）'
            : session.status === 'complete'
              ? '六爻已成，等待锁定'
              : `第 ${session.lines.length + 1} 爻`}
        </h1>
        {session === null ? (
          <>
            <label htmlFor="casting-question">
              问题仅保存在当前浏览器会话
              <textarea
                id="casting-question"
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder="例如：我应如何安排接下来的学习？"
                maxLength={1000}
              />
            </label>
            <section className="question-guide" aria-labelledby="question-guide-title">
              <h2 id="question-guide-title">让问题更容易回看（可选）</h2>
              <p className="muted">
                先写明情境、选择或回看时间。这里不会生成吉凶或建议，只帮助你保留这次匿名记录的上下文。
              </p>
              <div className="prompt-actions">
                {questionStarters.map((starter) => (
                  <button
                    className="prompt-chip"
                    key={starter.id}
                    type="button"
                    onClick={() =>
                      setQuestion((current) =>
                        current.trim().length > 0
                          ? `${current.trimEnd()}\n${starter.template}`
                          : starter.template,
                      )
                    }
                  >
                    {starter.title}
                  </button>
                ))}
              </div>
            </section>
            <p className="notice">
              数据不会上传云端，也不能跨设备同步；关闭浏览器会话或清除网站数据后可能丢失。
            </p>
            <button className="button" type="button" onClick={begin}>
              开始起卦
            </button>
          </>
        ) : (
          <>
            <div className="progress" aria-live="polite">
              <strong>{session.lines.length} / 6 爻</strong>
              <span className="muted">初爻在最下方</span>
            </div>
            <div className="casting-stage" ref={stageRef}>
              <div className="coins" aria-label="最近一次三枚铜钱的原始数值">
                {(latestLine?.coins ?? [null, null, null]).map((coin, index) => (
                  <div
                    className="coin"
                    key={index}
                    aria-label={`第 ${index + 1} 枚铜钱：${coin ?? '尚未起爻'}`}
                  >
                    <span>{coin ?? '—'}</span>
                  </div>
                ))}
              </div>
              <div className="line-progress" aria-hidden="true">
                {[6, 5, 4, 3, 2, 1].map((position) => {
                  const line = session.lines.find((candidate) => candidate.position === position);
                  return (
                    <span
                      className={`line-slot${line === undefined ? '' : ' filled'}${line?.movement === 'moving' ? ' moving' : ''}`}
                      data-position={position}
                      key={position}
                    />
                  );
                })}
              </div>
            </div>
            <p>
              {latestLine === undefined
                ? '点击按钮，由三枚独立铜钱生成第一爻。'
                : `最近一爻：${latestLine.value}，${latestLine.movement === 'moving' ? '动爻' : '静爻'}`}
            </p>
            {session.status === 'complete' && (
              <p className="completion-message" role="status">
                六次起爻已经完成。锁定后将查看本卦、变卦与动爻结构。
              </p>
            )}
            {session.status === 'complete' ? (
              <button className="button" type="button" onClick={lock}>
                锁定并查看结构结果
              </button>
            ) : (
              <button
                className="button"
                type="button"
                onClick={() => void cast()}
                disabled={isCasting}
              >
                {isCasting ? '起爻中…' : '起下一爻'}
              </button>
            )}
          </>
        )}
        {error !== null && <p role="alert">{error}</p>}
      </div>
      <aside className="card" aria-label="功能发布状态">
        <h2>起卦的范围</h2>
        <p>每次点击只生成一爻：三枚独立铜钱的和值为 6、7、8 或 9；第 1 次为初爻，第 6 次为上爻。</p>
        <p>专业六爻排盘、真实解卦与 AI 文本均保持关闭，避免未经核验的规则或内容被当作结论。</p>
        <Link href="/methodology">查看方法与发布状态</Link>
      </aside>
    </section>
  );
}
