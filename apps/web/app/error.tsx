'use client';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <section className="card">
      <h1>页面暂时无法加载</h1>
      <button className="button" onClick={reset}>
        重试
      </button>
    </section>
  );
}
