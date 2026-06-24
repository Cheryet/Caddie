/**
 * passwordRules — Unit tests
 * The live strength/requirement evaluation behind ChangePasswordScreen's
 * meter and checklist.
 */

import { evaluatePassword } from '../passwordRules';

describe('evaluatePassword', () => {
  it('an empty password has no score, label, or tone', () => {
    const result = evaluatePassword('');
    expect(result.score).toBe(0);
    expect(result.label).toBe('');
    expect(result.tone).toBe('none');
    expect(result.allMet).toBe(false);
  });

  it('flags each unmet requirement and reads as Weak', () => {
    const result = evaluatePassword('abcdefg'); // 7 chars, no digit, no upper
    expect(result.checks.map(c => c.met)).toEqual([false, false, false]);
    expect(result.label).toBe('Weak');
    expect(result.tone).toBe('warning');
    expect(result.allMet).toBe(false);
  });

  it('two of three met reads as Good (green)', () => {
    const result = evaluatePassword('abcdefg1'); // 8 chars + digit, no upper
    expect(result.score).toBe(2);
    expect(result.label).toBe('Good');
    expect(result.tone).toBe('success');
    expect(result.allMet).toBe(false);
  });

  it('all requirements met is Strong and allMet', () => {
    const result = evaluatePassword('Abcdefg1');
    expect(result.score).toBe(3);
    expect(result.label).toBe('Strong');
    expect(result.tone).toBe('success');
    expect(result.allMet).toBe(true);
  });
});
