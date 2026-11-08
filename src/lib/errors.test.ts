import { describe, expect, it } from 'vitest';
import { getErrorMessage, isOfflineError } from './errors';

describe('getErrorMessage', () => {
  it('returns the fallback for falsy errors', () => {
    expect(getErrorMessage(null)).toBe('Something went wrong. Please try again.');
    expect(getErrorMessage(undefined, 'Custom fallback')).toBe('Custom fallback');
    expect(getErrorMessage('', 'Custom fallback')).toBe('Custom fallback');
  });

  it('maps known messages to friendly text', () => {
    expect(getErrorMessage('Invalid login credentials')).toBe('Email or password is incorrect.');
    expect(getErrorMessage('Failed to fetch')).toBe(
      'Unable to reach the server. Check your connection and try again.',
    );
    expect(getErrorMessage('Missing or insufficient permissions')).toMatch(/Firestore denied/);
  });

  it('passes unknown strings through unchanged', () => {
    expect(getErrorMessage('Something bespoke happened')).toBe('Something bespoke happened');
  });

  it('reads message and error_description from error objects', () => {
    expect(getErrorMessage({ message: 'Invalid login credentials' })).toBe(
      'Email or password is incorrect.',
    );
    expect(getErrorMessage({ error_description: 'Failed to fetch' })).toMatch(/Unable to reach/);
  });

  it('handles database codes', () => {
    expect(getErrorMessage({ code: '23505' })).toBe('That value is already in use.');
    expect(getErrorMessage({ code: '23503' })).toBe('This item is no longer available.');
    expect(getErrorMessage({ code: '42501' })).toBe(
      'You do not have permission to perform this action.',
    );
  });

  it('detects row-level security and duplicate key messages', () => {
    expect(getErrorMessage({ message: 'new row violates row-level security policy' })).toBe(
      'You do not have permission to perform this action.',
    );
    expect(getErrorMessage({ message: 'duplicate key value violates unique constraint' })).toBe(
      'That value is already in use.',
    );
  });

  it('falls back when there is no usable message', () => {
    expect(getErrorMessage({ code: '99999' }, 'Nope')).toBe('Nope');
    expect(getErrorMessage(new Error(''), 'Nope')).toBe('Nope');
  });
});

describe('isOfflineError', () => {
  it('detects network failures', () => {
    expect(isOfflineError('Failed to fetch')).toBe(true);
    expect(isOfflineError({ message: 'NetworkError when attempting to fetch resource.' })).toBe(true);
  });

  it('is false for other errors', () => {
    expect(isOfflineError('Invalid login credentials')).toBe(false);
    expect(isOfflineError(null)).toBe(false);
  });
});
