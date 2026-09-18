import Link from 'next/link';

export default function HomePage() {
  return (
    <section className="hero">
      <p className="eyebrow">匿名 · 本机浏览器会话 · 结构可复核</p>
      <h1>以三枚铜钱， 记录一卦。</h1>
      <p className="lead">
        每一爻均由三枚独立的 2/3
        铜钱值计算而来。网站展示本卦、变卦与动爻结构，并提供已授权的卦辞/爻辞原文对照；未经发布的经传、专业六爻与
        AI 解读不会被伪造或补全。
      </p>
      <div className="actions">
        <Link className="button" href="/casting">
          开始匿名起卦
        </Link>
        <Link className="button secondary" href="/hexagrams">
          查看六十四卦结构
        </Link>
      </div>
      <p>
        <Link href="/methodology">了解三币起卦、内容审核与未发布功能的边界</Link>
      </p>
      <p className="muted">不登录、不上传问题。关闭会话或清除浏览器数据后，当前记录可能丢失。</p>
    </section>
  );
}
