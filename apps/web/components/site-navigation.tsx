'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

const links = [
  { href: '/casting', label: '起卦' },
  { href: '/hexagrams', label: '六十四卦' },
  { href: '/knowledge', label: '知识' },
  { href: '/methodology', label: '方法与证据' },
] as const;

export function SiteNavigation() {
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const firstLink = panelRef.current?.querySelector<HTMLAnchorElement>('a');
    firstLink?.focus();
  }, [open]);

  return (
    <div className="site-navigation">
      <button
        ref={toggleRef}
        className="mobile-nav-toggle"
        type="button"
        aria-expanded={open}
        aria-controls="primary-navigation"
        onClick={() => setOpen((current) => !current)}
      >
        <span aria-hidden="true" className="mobile-nav-glyph">
          {open ? '×' : '☰'}
        </span>
        <span>{open ? '关闭菜单' : '打开菜单'}</span>
      </button>
      <div ref={panelRef} id="primary-navigation" className={`nav-panel${open ? ' is-open' : ''}`}>
        <nav aria-label="主导航">
          {links.map((link) => (
            <Link href={link.href} key={link.href} onClick={() => setOpen(false)}>
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
