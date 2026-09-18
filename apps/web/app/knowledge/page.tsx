import {
  publicMethodology,
  verifiedClassicalQuoteContentVersion,
  verifiedContentVersion,
} from '@liuyao/content';
import Link from 'next/link';

export default function KnowledgePage() {
  return (
    <section>
      <p className="eyebrow">内容状态透明公开</p>
      <h1>知识与边界</h1>
      <p className="lead">
        当前公开的是八卦与六十四卦的可核验结构映射、匿名三币起卦得到的结构事实，以及项目负责人授权的卦辞与爻辞原文引用。
      </p>
      <div className="grid">
        <article className="card">
          <h2>已发布</h2>
          <p>结构内容版本：{verifiedContentVersion}</p>
          <p>原文引用版本：{verifiedClassicalQuoteContentVersion}</p>
          <p>
            显示名称、符号、上下卦、初爻至上爻的编码、本卦、变卦与动爻；并按实际本卦、动爻和变卦提供已授权的卦辞、爻辞对照。
          </p>
          <Link href="/hexagrams">浏览六十四卦结构目录</Link>
        </article>
        <article className="card">
          <h2>暂未发布</h2>
          <ul className="plain-list">
            {publicMethodology.layers
              .filter((layer) => layer.status === 'not-published')
              .map((layer) => (
                <li key={layer.id}>
                  <strong>{layer.title}</strong>：{layer.description}
                </li>
              ))}
          </ul>
        </article>
      </div>
      <section className="card" aria-labelledby="learning-path-title">
        <h2 id="learning-path-title">按结构学习：三个可操作步骤</h2>
        <ol className="timeline">
          <li>
            <strong>先收束问题</strong>
            <p>用一个具体情境、选择或回看时间开始匿名起卦；问题只保存在当前浏览器会话。</p>
          </li>
          <li>
            <strong>复核可计算事实</strong>
            <p>查看六次三币原始记录、本卦、变卦与动爻，确认初爻到上爻的顺序。</p>
          </li>
          <li>
            <strong>对照已发布内容</strong>
            <p>
              在六十四卦目录中浏览已核验映射与卦辞；在结果页对照本次动爻。彖传、象传、专业排盘和 AI
              解读仍须经过独立审核后才会启用。
            </p>
          </li>
        </ol>
        <div className="actions">
          <Link className="button" href="/casting">
            开始匿名起卦
          </Link>
          <Link className="button secondary" href="/methodology">
            查看审核条件
          </Link>
        </div>
      </section>
      <section className="card">
        <h2>为什么不直接补全内容？</h2>
        <p>
          经文、传统规则和现代产品表达属于不同的数据层。已授权的卦辞/爻辞与候选经传、专业规则、现代解释彼此隔离，页面不会把候选资料、网络摘录或自动生成文本误认为事实。
        </p>
        <Link href="/methodology">查看方法、证据与启用条件</Link>
      </section>
    </section>
  );
}
