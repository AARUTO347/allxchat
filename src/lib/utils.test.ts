import { describe, expect, it } from 'vitest';
import {
  cn,
  formatFileSize,
  generateId,
  getInitials,
  gradientForId,
  isAudioType,
  isImageType,
  isSameId,
  previewFromMessage,
  safeDecodeURI,
  truncate,
} from './utils';

describe('cn', () => {
  it('merges classes and resolves tailwind conflicts', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4');
    expect(cn('text-red-500', false && 'hidden', 'font-bold')).toBe('text-red-500 font-bold');
  });
});

describe('getInitials', () => {
  it('returns ? for missing names', () => {
    expect(getInitials(null)).toBe('?');
    expect(getInitials(undefined)).toBe('?');
    expect(getInitials('   ')).toBe('?');
  });

  it('uses up to two letters for single names', () => {
    expect(getInitials('Aaruto')).toBe('AA');
    expect(getInitials('Jo')).toBe('JO');
  });

  it('uses first + last initials and collapses whitespace', () => {
    expect(getInitials('Aaruto Patel')).toBe('AP');
    expect(getInitials('  ada   lovelace ')).toBe('AL');
  });
});

describe('gradientForId', () => {
  it('returns the default gradient for missing ids', () => {
    expect(gradientForId(null)).toBe(gradientForId(undefined));
    expect(gradientForId('')).toBe(gradientForId(null));
  });

  it('is deterministic per id', () => {
    expect(gradientForId('user-123')).toBe(gradientForId('user-123'));
    expect(gradientForId('user-123')).toMatch(/^from-/);
  });
});

describe('truncate', () => {
  it('leaves short strings untouched', () => {
    expect(truncate('hello', 10)).toBe('hello');
  });

  it('truncates with an ellipsis', () => {
    expect(truncate('hello world', 5)).toBe('hell…');
  });
});

describe('formatFileSize', () => {
  it('returns empty for invalid sizes', () => {
    expect(formatFileSize(null)).toBe('');
    expect(formatFileSize(0)).toBe('');
    expect(formatFileSize(-5)).toBe('');
  });

  it('formats bytes, kb and mb', () => {
    expect(formatFileSize(512)).toBe('512 B');
    expect(formatFileSize(2048)).toBe('2.0 KB');
    expect(formatFileSize(5 * 1024 * 1024)).toBe('5.0 MB');
  });
});

describe('generateId', () => {
  it('produces unique ids', () => {
    expect(generateId()).not.toBe(generateId());
    expect(generateId()).toBeTruthy();
  });
});

describe('type guards', () => {
  it('detects image and audio mime types', () => {
    expect(isImageType('image/png')).toBe(true);
    expect(isImageType('video/mp4')).toBe(false);
    expect(isImageType(null)).toBe(false);
    expect(isAudioType('audio/mpeg')).toBe(true);
    expect(isAudioType('image/png')).toBe(false);
  });

  it('compares ids safely', () => {
    expect(isSameId('a', 'a')).toBe(true);
    expect(isSameId('a', 'b')).toBe(false);
    expect(isSameId(null, 'a')).toBe(false);
    expect(isSameId('a', undefined)).toBe(false);
  });
});

describe('previewFromMessage', () => {
  it('collapses whitespace in content', () => {
    expect(previewFromMessage('  hello\n  world  ', 'text', null)).toBe('hello world');
  });

  it('falls back to type-specific labels', () => {
    expect(previewFromMessage(null, 'image', null)).toBe('Photo');
    expect(previewFromMessage('', 'audio', null)).toBe('Voice message');
    expect(previewFromMessage(null, 'file', 'report.pdf')).toBe('Document: report.pdf');
    expect(previewFromMessage(null, 'file', null)).toBe('Document');
    expect(previewFromMessage(null, 'text', null)).toBe('Message');
  });
});

describe('safeDecodeURI', () => {
  it('decodes valid URIs', () => {
    expect(safeDecodeURI('hello%20world')).toBe('hello world');
  });

  it('returns the original on malformed input', () => {
    expect(safeDecodeURI('%E0%A4%A')).toBe('%E0%A4%A');
  });
});
