import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { Logo } from '../components/ui/Logo';

export function NotFoundPage() {
  return (
    <div className="flex h-dvh flex-col items-center justify-center bg-[#f0f2f5] px-6 text-center dark:bg-[#0b141a]">
      <Logo size={52} />
      <div className="mt-8 flex h-16 w-16 items-center justify-center rounded-full bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
        <Compass size={30} />
      </div>
      <h1 className="mt-5 text-2xl font-semibold text-[#111b21] dark:text-[#e9edef]">
        This page went off-grid
      </h1>
      <p className="mt-2 max-w-sm text-sm leading-6 text-[#667781] dark:text-[#8696a0]">
        The link may be broken or the page may have moved. Your conversations are still safe.
      </p>
      <Link to="/chat" className="btn-primary mt-6">
        Back to chats
      </Link>
    </div>
  );
}
