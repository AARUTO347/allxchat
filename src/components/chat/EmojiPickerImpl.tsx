import EmojiPicker, { EmojiStyle, Theme, type EmojiClickData } from 'emoji-picker-react';

interface EmojiPickerImplProps {
  isDark: boolean;
  onEmoji: (emoji: EmojiClickData) => void;
}

export default function EmojiPickerImpl({ isDark, onEmoji }: EmojiPickerImplProps) {
  return (
    <EmojiPicker
      onEmojiClick={onEmoji}
      theme={isDark ? Theme.DARK : Theme.LIGHT}
      emojiStyle={EmojiStyle.NATIVE}
      width={320}
      height={380}
      lazyLoadEmojis
      previewConfig={{ showPreview: false }}
      searchPlaceHolder="Search emoji"
    />
  );
}
