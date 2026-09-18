import Link from 'next/link';

import { BrandMark } from '../components/brand-mark';

export default function HomePage() {
  return (
    <>
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-copy">
          <p className="eyebrow">匿名 · 本机浏览器会话 · 结构可复核</p>
          <h1 id="hero-title">
            以三枚铜钱，
            <span>记录一卦。</span>
          </h1>
          <p className="lead">
            每一爻都由三枚独立铜钱计算。灵犀 Meta
            展示本卦、变卦与动爻，保留原始记录与版本证据；未经发布的专业规则和 AI
            解读不会被伪造或补全。
          </p>
          <div className="actions">
            <Link className="button" href="/casting">
              开始匿名起卦
            </Link>
            <Link className="button secondary" href="/hexagrams">
              查看六十四卦
            </Link>
          </div>
          <p className="method-link">
            <Link href="/methodology">了解三币起卦、内容审核与发布边界</Link>
          </p>
          <p className="muted">无需登录，不上传问题；当前记录仅保存在本次浏览器会话。</p>
        </div>
        <div className="hero-seal" aria-hidden="true">
          <BrandMark className="hero-mark" />
          <p>观象 · 记数 · 可复核</p>
        </div>
      </section>
      <section className="home-evidence" aria-labelledby="home-evidence-title">
        <div className="section-heading">
          <p className="eyebrow">一张可复核的数字纸面</p>
          <h2 id="home-evidence-title">先记录，再理解。</h2>
          <p className="muted">
            灵犀 Meta 只呈现已计算的结构事实，把算法、版本与隐私边界留在明面上。
          </p>
        </div>
        <div className="evidence-grid">
          <article>
            <span className="evidence-index">01</span>
            <h3>三币起爻</h3>
            <p>每一爻保留三枚铜钱原值与和值，不用动画替代随机结果。</p>
          </article>
          <article>
            <span className="evidence-index">02</span>
            <h3>六爻成卦</h3>
            <p>从初爻到上爻自下而上形成本卦、动爻与变卦结构。</p>
          </article>
          <article>
            <span className="evidence-index">03</span>
            <h3>匿名可回看</h3>
            <p>问题和记录只保存在当前浏览器会话，不上传云端、不要求登录。</p>
          </article>
        </div>
        <div className="signature-divider" aria-hidden="true">
          <span />
          <i />
          <b />
        </div>
      </section>
    </>
  );
}
