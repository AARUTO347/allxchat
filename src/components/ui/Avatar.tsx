import { useEffect, useState } from 'react';
import { Users } from 'lucide-react';
import { cn, getInitials, gradientForId } from '../../lib/utils';

interface AvatarProps {
  name: string | null | undefined;
  src?: string | null;
  id?: string | null;
  size?: number;
  isGroup?: boolean;
  online?: boolean;
  showOnline?: boolean;
  className?: string;
}

export function Avatar({
  name,
  src,
  id,
  size = 48,
  isGroup = false,
  online = false,
  showOnline = false,
  className,
}: AvatarProps) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  const fontSize = Math.max(11, Math.round(size * 0.31));
  const dotSize = Math.max(10, Math.round(size * 0.25));

  return (
    <span
      className={cn('relative inline-flex shrink-0 select-none', className)}
      style={{ width: size, height: size }}
    >
      {src && !failed ? (
        <img
          src={src}
          alt={name ? `${name}'s avatar` : 'Avatar'}
          width={size}
          height={size}
          loading="lazy"
          onError={() => setFailed(true)}
          className="h-full w-full rounded-full object-cover"
        />
      ) : (
        <span
          className={cn(
            'flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br text-white shadow-inner',
            gradientForId(id || name),
          )}
          style={{ fontSize }}
          aria-hidden="true"
        >
          {isGroup ? (
            <Users style={{ width: size * 0.45, height: size * 0.45 }} strokeWidth={2.2} />
          ) : (
            <span className="font-semibold tracking-wide">{getInitials(name)}</span>
          )}
        </span>
      )}
      {showOnline && (
        <span
          className={cn(
            'absolute bottom-0 right-0 rounded-full border-2 border-white dark:border-[#111b21]',
            online ? 'bg-emerald-500' : 'bg-slate-400 dark:bg-slate-500',
          )}
          style={{ width: dotSize, height: dotSize }}
          aria-label={online ? 'Online' : 'Offline'}
        />
      )}
    </span>
  );
}
