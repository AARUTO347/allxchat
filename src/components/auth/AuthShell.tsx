import type { ReactNode } from 'react';
import { CheckCircle2, LockKeyhole, MessagesSquare, ShieldCheck, Zap } from 'lucide-react';
import { Logo } from '../ui/Logo';

interface AuthShellProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}

const FEATURES = [
  { icon: Zap, label: 'Real-time messaging with delivery receipts' },
  { icon: ShieldCheck, label: 'Private by design with row-level security' },
  { icon: MessagesSquare, label: 'Direct chats, groups, files, and voice notes' },
];

export function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
  return (
    <div className="h-dvh overflow-y-auto bg-[#f0f2f5] dark:bg-[#0b141a]">
      <div className="flex min-h-dvh">
        <aside className="auth-pattern relative hidden w-[46%] max-w-[680px] flex-col justify-between overflow-hidden p-12 lg:flex xl:p-16">
          <div className="auth-grid absolute inset-0" aria-hidden="true" />
          <div className="relative z-10 flex items-center gap-3">
            <Logo showWordmark={false} size={50} />
            <span className="text-2xl font-bold tracking-tight text-white">ALLXCHAT</span>
          </div>

          <div className="relative z-10 max-w-lg">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-widest text-emerald-100">
              <LockKeyhole size={13} />
              Conversations, protected
            </div>
            <h1 className="text-balance text-4xl font-semibold leading-[1.12] tracking-tight text-white xl:text-5xl">
              Chat freely.
              <br />
              Stay close.
            </h1>
            <p className="mt-5 max-w-md text-[15px] leading-7 text-emerald-50/70">
              A fast, elegant home for your conversations — with the security your messages deserve.
            </p>
            <ul className="mt-9 space-y-4">
              {FEATURES.map((feature) => (
                <li key={feature.label} className="flex items-center gap-3 text-sm text-emerald-50/90">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/10">
                    <feature.icon size={15} />
                  </span>
                  {feature.label}
                </li>
              ))}
            </ul>
          </div>

          <div className="relative z-10 flex items-center gap-2 text-xs text-emerald-100/50">
            <CheckCircle2 size={14} />
            Secure sessions · Responsive by default · Built for speed
          </div>

          <div className="pointer-events-none absolute -right-20 top-24 h-72 w-72 rounded-full border border-white/10 bg-white/[0.035]" />
          <div className="pointer-events-none absolute -bottom-28 right-24 h-80 w-80 rounded-full border border-white/10 bg-emerald-300/[0.055]" />
        </aside>

        <main className="flex min-h-dvh flex-1 flex-col bg-white dark:bg-[#111b21]">
          <div className="flex items-center justify-between px-6 pb-2 pt-6 lg:hidden">
            <Logo size={34} />
            <span className="rounded-full bg-brand-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
              Secure chat
            </span>
          </div>

          <div className="flex flex-1 items-center justify-center px-5 py-8 sm:px-10">
            <div className="w-full max-w-[420px] animate-fade-in">
              <div className="mb-8">
                <h2 className="text-[1.75rem] font-semibold tracking-tight text-[#111b21] dark:text-white">
                  {title}
                </h2>
                <p className="mt-2 text-sm leading-6 text-[#667781] dark:text-[#8696a0]">{subtitle}</p>
              </div>
              {children}
              {footer && <div className="mt-7">{footer}</div>}
            </div>
          </div>

          <div className="px-6 pb-6 text-center text-[11px] leading-5 text-[#8696a0]">
            By continuing, you agree to keep this workspace respectful and secure.
          </div>
        </main>
      </div>
    </div>
  );
}
