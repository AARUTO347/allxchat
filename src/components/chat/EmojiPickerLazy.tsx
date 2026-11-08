import { lazy, Suspense } from 'react';
import type { EmojiClickData } from 'emoji-picker-react';

const EmojiPicker = lazy(() => import('./EmojiPickerImpl'));

interface EmojiPickerLazyProps {
  isDark: boolean;
  onEmoji: (emoji: EmojiClickData) => void;
}

export function EmojiPickerLazy({ isDark, onEmoji }: EmojiPickerLazyProps) {
  return (
    <Suspense
      fallback={
        <div className="flex h-[380px] w-[320px] items-center justify-center rounded-xl bg-white text-sm text-[#667781] shadow-xl dark:bg-[#202c33] dark:text-[#8696a0]">
          Loading emoji…
        </div>
      }
    >
      <EmojiPicker isDark={isDark} onEmoji={onEmoji} />
    </Suspense>
  );
}
