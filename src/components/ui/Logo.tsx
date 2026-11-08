import { useId } from 'react';
import { cn } from '../../lib/utils';

interface LogoProps {
  showWordmark?: boolean;
  size?: number;
  className?: string;
}

export function Logo({ showWordmark = true, size = 40, className }: LogoProps) {
  const gradientId = useId();
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        aria-hidden="true"
        className="shrink-0 drop-shadow-sm"
      >
        <defs>
          <linearGradient id={gradientId} x1="8" y1="8" x2="56" y2="56" gradientUnits="userSpaceOnUse">
            <stop stopColor="#34D399" />
            <stop offset="1" stopColor="#047857" />
          </linearGradient>
        </defs>
        <rect width="64" height="64" rx="18" fill={`url(#${gradientId})`} />
        <path
          d="M18 20.5C18 18.57 19.57 17 21.5 17h21c1.93 0 3.5 1.57 3.5 3.5v15c0 1.93-1.57 3.5-3.5 3.5H31l-8.4 6.3c-.66.5-1.6.03-1.6-.8V20.5Z"
          fill="white"
          fillOpacity=".96"
        />
        <path d="M26 26h12M26 31h8" stroke="#059669" strokeWidth="2.6" strokeLinecap="round" />
        <circle cx="46" cy="47" r="8" fill="#111B21" stroke="white" strokeWidth="3" />
        <path
          d="m43 47 2 2 4-4"
          stroke="white"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {showWordmark && (
        <span className="text-[1.2rem] font-bold tracking-tight text-[#111b21] dark:text-white">
          ALL<span className="text-brand-600 dark:text-brand-400">X</span>CHAT
        </span>
      )}
    </div>
  );
}
