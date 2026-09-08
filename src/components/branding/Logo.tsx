// Single source of truth for the Adparlorr brand mark + wordmark. Fixed hex
// colors (not Tailwind's `brand-*` teal token, which is unrelated) so the
// mark renders identically regardless of which page's theme it sits in.
const MARK_GRADIENT_FROM = '#ff2f6e';
const MARK_GRADIENT_TO = '#c8114f';

let gradientIdCounter = 0;

interface LogoMarkProps {
  size?: number;
  className?: string;
}

export function LogoMark({ size = 28, className = '' }: LogoMarkProps) {
  // A unique gradient id per instance — multiple logos can render on one
  // page (e.g. desktop header + mobile drawer) without id collisions.
  const gradientId = `adparlor-logo-gradient-${(gradientIdCounter += 1)}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      role="img"
      aria-label="Adparlorr logo mark"
      className={className}
    >
      <rect width="32" height="32" rx="8" fill={`url(#${gradientId})`} />
      <path d="M9 7.5 L23 16 L9 24.5 Z" fill="#ffffff" fillOpacity="0.4" />
      <path d="M9 7.5 L19 16 L9 24.5 Z" fill="#ffffff" />
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor={MARK_GRADIENT_FROM} />
          <stop offset="1" stopColor={MARK_GRADIENT_TO} />
        </linearGradient>
      </defs>
    </svg>
  );
}

type LogoSize = 'sm' | 'md' | 'lg';

const SIZE_MAP: Record<LogoSize, { mark: number; text: string; gap: string }> = {
  sm: { mark: 22, text: 'text-base', gap: 'gap-1.5' },
  md: { mark: 26, text: 'text-lg', gap: 'gap-2' },
  lg: { mark: 30, text: 'text-xl', gap: 'gap-2' },
};

interface LogoProps {
  // Which background the logo sits on — 'dark' renders a white wordmark
  // (for the app's ink-900 headers), 'light' renders a dark wordmark (for
  // the white/neutral marketing site surfaces).
  variant?: 'dark' | 'light';
  size?: LogoSize;
  // Renders only the mark, no wordmark text — for tight spaces.
  iconOnly?: boolean;
  className?: string;
}

export function Logo({ variant = 'dark', size = 'md', iconOnly = false, className = '' }: LogoProps) {
  const { mark, text, gap } = SIZE_MAP[size];
  const textColor = variant === 'dark' ? 'text-white' : 'text-slate-900';

  return (
    <span className={`inline-flex items-center ${gap} ${className}`}>
      <LogoMark size={mark} />
      {!iconOnly && <span className={`${text} font-extrabold tracking-tight ${textColor}`}>Adparlorr</span>}
    </span>
  );
}
