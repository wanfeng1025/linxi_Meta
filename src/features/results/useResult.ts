import { useEffect, useRef, useState } from 'react';

import type { PageResult } from '@/application/page';
import { useAppRuntime } from '@/features/app/AppRuntimeProvider';

export function useResult(sessionId: string | undefined) {
  const runtime = useAppRuntime();
  const getResult = useRef(runtime.getResult);
  const [result, setResult] = useState<PageResult | null>(null);
  const [loading, setLoading] = useState(sessionId !== undefined);
  const [error, setError] = useState<string | null>(
    sessionId === undefined ? '缺少会话 ID。' : null,
  );

  useEffect(() => {
    getResult.current = runtime.getResult;
  }, [runtime.getResult]);

  useEffect(() => {
    let cancelled = false;
    if (sessionId === undefined) return;
    void Promise.resolve().then(() => {
      if (!cancelled) setLoading(true);
    });
    getResult
      .current(sessionId)
      .then((value) => {
        if (!cancelled) {
          setResult(value);
          setError(value === null ? '找不到这条历史记录。' : null);
        }
      })
      .catch((reason: unknown) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : '读取结果失败。');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  return { result, setResult, loading, error };
}
