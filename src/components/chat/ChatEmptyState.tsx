import { LockKeyhole, MessagesSquare, ShieldCheck, UsersRound, Zap } from 'lucide-react';
import { Logo } from '../ui/Logo';

export function ChatEmptyState() {
  return (
    <div className="chat-wallpaper relative flex h-full flex-1 flex-col items-center justify-center px-10 text-center">
      <div className="absolute inset-x-0 top-0 h-16 border-b border-black/[0.06] bg-[#f0f2f5] dark:border-white/[0.06] dark:bg-[#202c33]" />
      <div className="relative z-10 max-w-xl">
        <Logo size={68} className="mb-6 justify-center" />
        <h2 className="text-[1.7rem] font-semibold tracking-tight text-[#111b21] dark:text-[#e9edef]">
          Your conversations, all in one place
        </h2>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[#667781] dark:text-[#8696a0]">
          Select a chat to start messaging, or begin a new private conversation or group.
        </p>
        <div className="mx-auto mt-8 grid max-w-lg grid-cols-1 gap-3 text-left sm:grid-cols-2">
          {[
            { icon: Zap, title: 'Real-time', text: 'Instant messages, typing, and receipts' },
            { icon: ShieldCheck, title: 'Protected', text: 'RLS keeps every conversation private' },
            { icon: MessagesSquare, title: 'Expressive', text: 'Photos, documents, and voice notes' },
            { icon: UsersRound, title: 'Groups', text: 'Bring your team or circle together' },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-black/[0.06] bg-white/80 p-3.5 backdrop-blur-sm dark:border-white/[0.08] dark:bg-[#111b21]/80"
            >
              <item.icon size={17} className="text-brand-600 dark:text-brand-400" />
              <p className="mt-2 text-sm font-semibold text-[#111b21] dark:text-[#e9edef]">
                {item.title}
              </p>
              <p className="mt-0.5 text-xs leading-5 text-[#667781] dark:text-[#8696a0]">{item.text}</p>
            </div>
          ))}
        </div>
        <div className="mt-7 inline-flex items-center gap-2 rounded-full border border-black/[0.06] bg-white/70 px-3 py-1.5 text-[11px] text-[#667781] dark:border-white/[0.08] dark:bg-[#111b21]/70 dark:text-[#8696a0]">
          <LockKeyhole size={12} />
          Private to you and the people in each chat
        </div>
      </div>
    </div>
  );
}
