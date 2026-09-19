interface BrandMarkProps {
  readonly className?: string;
  readonly title?: string;
}

export function BrandMark({ className = '', title }: BrandMarkProps) {
  const labelled = title !== undefined;

  return (
    <svg
      className={className}
      viewBox="0 0 112 64"
      role={labelled ? 'img' : undefined}
      aria-hidden={labelled ? undefined : true}
      aria-label={title}
      focusable="false"
    >
      <g className="brand-mark-taiji">
        <circle cx="32" cy="32" r="28" fill="currentColor" />
        <path
          d="M32 4a14 14 0 0 1 0 28 14 14 0 0 0 0 28 28 28 0 0 1 0-56Z"
          fill="var(--brand-mark-paper, #f5ead0)"
        />
        <circle cx="32" cy="18" r="4.2" fill="var(--brand-mark-paper, #f5ead0)" />
        <circle cx="32" cy="46" r="4.2" fill="currentColor" />
      </g>
      <g className="brand-mark-lines" fill="currentColor">
        <rect x="70" y="9" width="33" height="4" rx="2" />
        <rect x="70" y="18" width="13" height="4" rx="2" />
        <rect x="90" y="18" width="13" height="4" rx="2" />
        <rect x="70" y="27" width="33" height="4" rx="2" />
        <rect x="70" y="36" width="13" height="4" rx="2" />
        <rect x="90" y="36" width="13" height="4" rx="2" />
        <rect x="70" y="45" width="33" height="4" rx="2" />
        <rect x="70" y="54" width="13" height="4" rx="2" />
        <rect x="90" y="54" width="13" height="4" rx="2" />
      </g>
    </svg>
  );
}
