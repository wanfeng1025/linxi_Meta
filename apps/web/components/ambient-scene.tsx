'use client';

import { gsap } from 'gsap';
import { useEffect, useRef } from 'react';

export function AmbientScene() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (rootRef.current === null) return;

    const media = gsap.matchMedia();
    const select = gsap.utils.selector(rootRef);
    media.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.to(select('.ambient-taiji'), {
        rotate: 360,
        duration: 70,
        ease: 'none',
        repeat: -1,
      });
      gsap.to(select('.cloud-one'), {
        xPercent: 15,
        yPercent: -6,
        duration: 18,
        ease: 'sine.inOut',
        repeat: -1,
        yoyo: true,
      });
      gsap.to(select('.cloud-two'), {
        xPercent: -18,
        yPercent: 8,
        duration: 24,
        ease: 'sine.inOut',
        repeat: -1,
        yoyo: true,
      });
      gsap.to(select('.ambient-hexagram'), {
        opacity: 0.34,
        scale: 1.03,
        duration: 5.5,
        ease: 'sine.inOut',
        repeat: -1,
        yoyo: true,
      });
    });

    return () => media.revert();
  }, []);

  return (
    <div className="ambient-scene" ref={rootRef} aria-hidden="true">
      <div className="ambient-taiji">
        <span />
        <i />
        <b />
      </div>
      <div className="ambient-cloud cloud-one" />
      <div className="ambient-cloud cloud-two" />
      <div className="ambient-hexagram">䷊</div>
    </div>
  );
}
