import { describe, expect, it } from 'vitest';
import {
  MAX_AVATAR_SIZE,
  MAX_FILE_SIZE,
  sanitizeSearchQuery,
  sanitizeText,
  validateAvatar,
  validateEmail,
  validateFile,
  validatePassword,
  validateUsername,
  type ValidatedFile,
} from './validation';

function fakeFile(name: string, type: string, size: number): File {
  return { name, type, size } as unknown as File;
}

describe('sanitizeSearchQuery', () => {
  it('removes PostgREST filter metacharacters and collapses whitespace', () => {
    expect(sanitizeSearchQuery('  hello, (world) %* "quote" \\ test  ')).toBe(
      'hello world quote test',
    );
  });

  it('limits search terms to 100 characters', () => {
    expect(sanitizeSearchQuery('a'.repeat(150))).toHaveLength(100);
  });
});

describe('sanitizeText', () => {
  it('normalizes line endings and strips control characters', () => {
    expect(sanitizeText('hello\r\nworld\u0000!')).toBe('hello\nworld!');
  });

  it('removes trailing spaces before a newline', () => {
    expect(sanitizeText('hello   \nworld')).toBe('hello\nworld');
  });
});

describe('validateFile', () => {
  it('accepts supported documents and reports the canonical extension', () => {
    const result = validateFile(fakeFile('Report.PDF', 'application/pdf', 2048));
    expect(typeof result).not.toBe('string');
    expect((result as ValidatedFile).extension).toBe('pdf');
    expect((result as ValidatedFile).messageType).toBe('file');
  });

  it('uses the MIME type to determine image extensions', () => {
    const result = validateFile(fakeFile('photo.png', 'image/jpeg', 2048));
    expect(typeof result).not.toBe('string');
    expect((result as ValidatedFile).extension).toBe('jpg');
    expect((result as ValidatedFile).messageType).toBe('image');
  });

  it('falls back to the extension when the browser omits the MIME type', () => {
    const result = validateFile(fakeFile('notes.txt', '', 10));
    expect(typeof result).not.toBe('string');
    expect((result as ValidatedFile).mime).toBe('text/plain');
  });

  it('rejects unsupported, empty, and oversized files', () => {
    expect(validateFile(fakeFile('payload.exe', 'application/octet-stream', 100))).toBe(
      'This file type is not supported.',
    );
    expect(validateFile(fakeFile('empty.txt', 'text/plain', 0))).toBe(
      'The selected file is empty.',
    );
    expect(
      validateFile(fakeFile('large.pdf', 'application/pdf', MAX_FILE_SIZE + 1)),
    ).toBe('Files must be 5 MB or smaller.');
  });
});

describe('validateAvatar', () => {
  it('accepts supported images and rejects empty or oversized files', () => {
    expect(validateAvatar(fakeFile('avatar.webp', 'image/webp', 1024))).toBeNull();
    expect(validateAvatar(fakeFile('avatar.png', 'image/png', 0))).toBe(
      'The selected image is empty.',
    );
    expect(
      validateAvatar(fakeFile('avatar.jpg', 'image/jpeg', MAX_AVATAR_SIZE + 1)),
    ).toBe('Profile photos must be 5 MB or smaller.');
  });
});

describe('account validation', () => {
  it('validates usernames, emails, and passwords', () => {
    expect(validateUsername('aaruto_1')).toBeNull();
    expect(validateUsername('no spaces')).not.toBeNull();
    expect(validateEmail('person@example.com')).toBeNull();
    expect(validateEmail('not-an-email')).not.toBeNull();
    expect(validatePassword('longenough')).toBeNull();
    expect(validatePassword('short')).not.toBeNull();
  });
});
