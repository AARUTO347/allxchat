import {
  useEffect,
  useRef,
  type ButtonHTMLAttributes,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { Loader2, X } from 'lucide-react';
import { cn } from '../../lib/utils';

export function Spinner({ className, size = 18 }: { className?: string; size?: number }) {
  return <Loader2 size={size} className={cn('animate-spin', className)} aria-hidden="true" />;
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  children: ReactNode;
}

export function IconButton({ label, children, className, ...props }: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn('icon-button', className)}
      {...props}
    >
      {children}
    </button>
  );
}

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-8 py-12 text-center', className)}>
      {icon && (
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-black/[0.04] text-[#54656f] dark:bg-white/[0.06] dark:text-[#aebac1]">
          {icon}
        </div>
      )}
      <h3 className="text-base font-semibold text-[#111b21] dark:text-[#e9edef]">{title}</h3>
      {description && (
        <p className="mt-1.5 max-w-sm text-sm leading-6 text-[#667781] dark:text-[#8696a0]">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

function useModalBehavior(open: boolean, onClose: () => void) {
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const previousActive = document.activeElement as HTMLElement | null;
    document.body.style.overflow = 'hidden';
    const timer = window.setTimeout(() => panelRef.current?.focus(), 30);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current();
      if (event.key !== 'Tab' || !panelRef.current) return;
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
      window.clearTimeout(timer);
      previousActive?.focus?.();
    };
  }, [open]);

  return panelRef;
}

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  className,
}: ModalProps) {
  const panelRef = useModalBehavior(open, onClose);
  if (!open) return null;

  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-2xl',
  };

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/45 p-0 backdrop-blur-[2px] sm:items-center sm:p-5">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title || 'Dialog'}
        className={cn(
          'relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl outline-none animate-slide-up dark:bg-[#111b21] sm:rounded-2xl',
          sizes[size],
          className,
        )}
      >
        {title && (
          <div className="flex items-start justify-between gap-4 border-b border-black/[0.06] px-5 py-4 dark:border-white/[0.08]">
            <div>
              <h2 className="text-lg font-semibold text-[#111b21] dark:text-[#e9edef]">{title}</h2>
              {description && (
                <p className="mt-1 text-sm text-[#667781] dark:text-[#8696a0]">{description}</p>
              )}
            </div>
            <IconButton label="Close" onClick={onClose} className="-mr-1">
              <X size={20} />
            </IconButton>
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
        {footer && (
          <div className="border-t border-black/[0.06] bg-[#f7f8fa] px-5 py-3 dark:border-white/[0.08] dark:bg-[#0b141a]">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  side?: 'left' | 'right';
  widthClass?: string;
}

export function Drawer({
  open,
  onClose,
  title,
  children,
  footer,
  side = 'right',
  widthClass = 'sm:max-w-md',
}: DrawerProps) {
  const panelRef = useModalBehavior(open, onClose);
  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[70] bg-black/45 backdrop-blur-[2px]">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close panel"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title || 'Panel'}
        className={cn(
          'absolute top-0 flex h-full w-full flex-col overflow-hidden bg-white shadow-2xl outline-none animate-slide-up dark:bg-[#111b21]',
          widthClass,
          side === 'right' ? 'right-0' : 'left-0',
        )}
      >
        {title && (
          <div className="flex items-center justify-between border-b border-black/[0.06] px-4 py-3.5 dark:border-white/[0.08]">
            <h2 className="text-lg font-semibold text-[#111b21] dark:text-[#e9edef]">{title}</h2>
            <IconButton label="Close" onClick={onClose}>
              <X size={20} />
            </IconButton>
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
        {footer && (
          <div className="border-t border-black/[0.06] bg-[#f7f8fa] px-4 py-3 dark:border-white/[0.08] dark:bg-[#0b141a]">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

export function LoadingScreen({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex h-dvh flex-col items-center justify-center gap-4 bg-[#f0f2f5] dark:bg-[#0b141a]">
      <Spinner size={30} className="text-brand-600" />
      <p className="text-sm text-[#667781] dark:text-[#8696a0]">{label}</p>
    </div>
  );
}
