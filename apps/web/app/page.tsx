import Image from 'next/image';
import Link from 'next/link';

export default function HomePage() {
  return (
    <>
      <section className="home-hero" aria-labelledby="hero-title">
        <div className="home-hero-art" aria-hidden="true">
          <Image
            src="/visuals/ink-sun-moon-hero.webp"
            alt=""
            fill
            priority
            sizes="(max-width: 680px) 100vw, 1120px"
          />
        </div>
        <div className="home-hero-shade" aria-hidden="true" />
        <div className="home-hero-copy">
          <p className="eyebrow">匿名起卦 · 本机保存 · 结构可复核</p>
          <h1 id="hero-title">
            一问，一卦，
            <span>一次清醒的观照。</span>
          </h1>
          <p className="lead">使用三枚独立铜钱记录六爻，呈现本卦、动爻与变卦。</p>
          <div className="actions">
            <Link className="button" href="/casting">
              开始匿名起卦
            </Link>
            <Link className="button secondary" href="/hexagrams">
              查看六十四卦
            </Link>
          </div>
          <p className="home-privacy">问题与记录仅保存在当前浏览器会话。</p>
        </div>
        <div className="home-hero-notation" aria-hidden="true">
          <span>观象</span>
          <i />
          <span>记数</span>
          <i />
          <span>复核</span>
        </div>
      </section>
      <section className="home-ritual" aria-labelledby="home-ritual-title">
        <div className="home-ritual-heading">
          <p className="eyebrow">一张可复核的数字纸面</p>
          <h2 id="home-ritual-title">先记录，再理解。</h2>
          <p className="muted">把一次提问还原为可回看的三步：记数、成卦、留存。</p>
        </div>
        <ol className="home-ritual-list">
          <li>
            <span className="evidence-index">01</span>
            <div>
              <h3>三币记录</h3>
              <p>每一爻保留三枚独立铜钱的原值与和值。</p>
            </div>
          </li>
          <li>
            <span className="evidence-index">02</span>
            <div>
              <h3>六爻成卦</h3>
              <p>从初爻到上爻，呈现本卦、动爻与变卦结构。</p>
            </div>
          </li>
          <li>
            <span className="evidence-index">03</span>
            <div>
              <h3>本机留存</h3>
              <p>问题与记录留在当前浏览器会话，不要求登录。</p>
            </div>
          </li>
        </ol>
        <div className="home-ritual-foot">
          <span>不替你下结论，只把过程留下来。</span>
          <Link href="/methodology">查看方法与证据</Link>
        </div>
      </section>
    </>
  );
}
