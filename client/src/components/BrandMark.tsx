interface BrandMarkProps {
  className?: string;
}

/**
 * Decorative product mark. Purely presentational: it is hidden from assistive
 * technology so the surrounding link or lockup keeps its own accessible name.
 */
export const BrandMark = ({ className = 'brand-mark' }: BrandMarkProps) => (
  <span className={className} aria-hidden="true">
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      focusable="false"
    >
      <path d="M3.6 11.2h16.8a8.4 8.4 0 0 1-16.8 0Z" />
      <path d="M2.2 11.2h19.6" />
      <path d="M9.1 7.6c0-1.2 1.2-1.6 1.2-2.8s-1.2-1.6-1.2-2.8" />
      <path d="M14.6 7.6c0-1.2 1.2-1.6 1.2-2.8s-1.2-1.6-1.2-2.8" />
    </svg>
  </span>
);
