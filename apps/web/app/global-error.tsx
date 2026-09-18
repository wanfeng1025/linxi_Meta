'use client';

import './globals.css';

export default function GlobalError({
  reset,
}: Readonly<{ error: Error & { digest?: string }; reset: () => void }>) {
  return (
    <html lang="zh-CN">
      <body>
        <main>
          <section className="card">
            <h1>网站暂时无法加载</h1>
            <p>本地会话数据没有上传。请重试，或回到首页重新开始匿名起卦。</p>
            <div className="actions">
              <button className="button" onClick={reset} type="button">
                重试
              </button>
              <a className="button secondary" href="/">
                返回首页
              </a>
            </div>
          </section>
        </main>
      </body>
    </html>
  );
}
