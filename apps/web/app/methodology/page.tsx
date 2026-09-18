import {
  publicMethodology,
  verifiedClassicalQuoteContentVersion,
  verifiedContentVersion,
} from '@liuyao/content';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: '方法与证据',
  description: '了解匿名三币起卦的计算方式、公开内容范围与专业规则的审核条件。',
};

export default function MethodologyPage() {
  return (
    <section>
      <p className="eyebrow">{publicMethodology.version}</p>
      <h1>方法与证据</h1>
      <p className="lead">
        本页说明网站实际计算了什么、没有计算什么，以及内容或规则需要达到何种证据标准才能公开。
      </p>

      <section className="card">
        <h2>匿名三币起卦</h2>
        <ol className="timeline">
          {publicMethodology.principles.map((principle) => (
            <li key={principle.id}>
              <strong>{principle.title}</strong>
              <p>{principle.description}</p>
            </li>
          ))}
        </ol>
        <Link className="button" href="/casting">
          开始匿名起卦
        </Link>
      </section>

      <section className="card">
        <h2>发布内容分层</h2>
        <div className="status-list">
          {publicMethodology.layers.map((layer) => (
            <article className="status-item" key={layer.id}>
              <p className={`status ${layer.status}`}>
                {layer.status === 'published' ? '已发布' : '尚未发布'}
              </p>
              <h3>{layer.title}</h3>
              <p>{layer.description}</p>
            </article>
          ))}
        </div>
        <p className="muted">
          当前已核验结构映射内容版本：{verifiedContentVersion}；已授权原文引用内容版本：
          {verifiedClassicalQuoteContentVersion}。
        </p>
      </section>

      <section className="card">
        <h2>{publicMethodology.classicalCandidateCollection.title}</h2>
        <p>{publicMethodology.classicalCandidateCollection.description}</p>
        <ul className="plain-list">
          {publicMethodology.classicalCandidateCollection.safeguards.map((safeguard) => (
            <li key={safeguard}>{safeguard}</li>
          ))}
        </ul>
      </section>

      <section className="grid">
        <article className="card">
          <h2>未发布功能的启用条件</h2>
          <ul className="plain-list">
            {publicMethodology.reviewRequirements.map((requirement) => (
              <li key={requirement}>{requirement}</li>
            ))}
          </ul>
        </article>
        <article className="card">
          <h2>使用边界</h2>
          <ul className="plain-list">
            {publicMethodology.decisionSafety.map((statement) => (
              <li key={statement}>{statement}</li>
            ))}
          </ul>
          <Link href="/disclaimer">阅读完整风险声明</Link>
        </article>
      </section>
    </section>
  );
}
