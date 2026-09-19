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
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';

import {
  loadActiveWebCastingSnapshot,
  saveWebCastingSnapshot,
  type WebCastingSnapshot,
} from '../../lib/session-storage';
import { createWebCryptoRandomSource } from '../../lib/web-crypto-random';

const now = () => new Date().toISOString();

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
  const [castPhase, setCastPhase] = useState<
    'idle' | 'ready' | 'casting' | 'result' | 'completed' | 'error'
  >(
    restoredSnapshot === null
      ? 'idle'
      : restoredSnapshot.session.status === 'complete'
        ? 'completed'
        : 'ready',
  );
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
      setCastPhase('ready');
    } catch {
      setError('无法创建本次起卦会话。请确认浏览器允许本地会话存储后重试。');
    }
  };

  const cast = async () => {
    if (session === null || isCasting) return;
    setIsCasting(true);
    setCastPhase('casting');
    try {
      const next = castNextLine(session, await drawThreeCoins(randomSource), now());
      persist(next, true);
      setSession(next);
      setError(null);
      setCastPhase(next.status === 'complete' ? 'completed' : 'result');
    } catch {
      setError('本次起爻未能保存，请重试。');
      setCastPhase('error');
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
      setCastPhase('completed');
      router.push(`/result/${locked.sessionId}`);
    } catch {
      setError('结果未能锁定或保存。请返回后重新开始一次起卦。');
      setCastPhase('error');
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
    <section className="casting-layout">
      <div className="card casting-card">
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
            <p className="privacy-line">问题仅保存在本次浏览器会话。</p>
            <button className="button" type="button" onClick={begin}>
              开始起卦
            </button>
          </>
        ) : (
          <>
            <div className="progress" aria-live="polite">
              <strong>{session.lines.length} / 6 爻</strong>
              <span className={`cast-phase phase-${castPhase}`}>
                {castPhase === 'casting'
                  ? '铜钱翻转中'
                  : castPhase === 'completed'
                    ? '六爻已成'
                    : castPhase === 'result'
                      ? '本爻已落定'
                      : '准备起爻'}
              </span>
              <span className="muted">初爻在最下方</span>
            </div>
            <div
              className={`casting-stage phase-${castPhase}`}
              ref={stageRef}
              data-phase={castPhase}
            >
              <div className="coins" aria-label="最近一次三枚铜钱的原始数值">
                {(latestLine?.coins ?? [null, null, null]).map((coin, index) => (
                  <div
                    className={`coin${coin === null ? ' is-empty' : ''}`}
                    key={index}
                    data-coin-index={index + 1}
                    aria-label={`第 ${index + 1} 枚铜钱：${coin ?? '尚未起爻'}`}
                  >
                    <span className="coin-value">{coin ?? '—'}</span>
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
            <p className="cast-readout" role="status" aria-live="polite">
              {latestLine === undefined
                ? '点击按钮，由三枚独立铜钱生成第一爻。'
                : `第 ${latestLine.position} 爻已落定：${latestLine.value}，${latestLine.movement === 'moving' ? '动爻' : '静爻'}`}
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
    </section>
  );
}
